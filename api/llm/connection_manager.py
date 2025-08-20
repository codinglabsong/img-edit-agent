"""
Database connection manager for robust Neon free tier handling.

This module provides thread-safe database connection management with automatic
reconnection, health monitoring, and background refresh capabilities.
"""

import atexit
import logging
import os
import threading
import time

from langgraph.checkpoint.postgres import PostgresSaver

# Configure logging
logger = logging.getLogger(__name__)

# Global connection state
_checkpointer = None
_checkpointer_lock = threading.Lock()
_last_connection_time = 0
_connection_timeout = 300  # 5 minutes - Neon free tier timeout
_refresh_interval = 240  # 4 minutes - refresh before timeout
_refresh_thread = None
_refresh_stop_event = threading.Event()


def _create_checkpointer():
    """Create a new PostgresSaver instance with optimized connection settings."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set. Point it to your Neon connection string.")

    # Enhanced keepalive settings for Neon free tier
    # More aggressive keepalives to prevent timeout
    keepalive_params = (
        "sslmode=require"
        "&keepalives=1"
        "&keepalives_idle=10"  # Reduced from 30 to 10 seconds
        "&keepalives_interval=5"  # Reduced from 10 to 5 seconds
        "&keepalives_count=5"  # Increased from 3 to 5
        "&connect_timeout=10"  # Connection timeout
        "&application_name=img_edit_agent"  # Identify our app
    )

    # Add keepalive params if missing
    if "keepalives=" not in url:
        sep = "&" if "?" in url else "?"
        url += sep + keepalive_params
    else:
        # If keepalives are already present, ensure our optimized settings are used
        if "keepalives_idle=10" not in url:
            logger.warning("Database URL already has keepalive settings, but they may not be optimized for Neon free tier")

    logger.info("Creating new database connection with optimized settings")
    cm = PostgresSaver.from_conn_string(url)
    saver = cm.__enter__()  # enter the context manager once
    atexit.register(lambda: cm.__exit__(None, None, None))  # clean shutdown
    saver.setup()  # create tables on first run; no-op afterward

    return saver


def _test_connection(checkpointer):
    """Test if the database connection is still alive."""
    try:
        # Simple test query to check connection health
        # This will fail if the connection is dead
        checkpointer.get({"configurable": {"thread_id": "test"}})
        return True
    except Exception as e:
        logger.warning(f"Database connection test failed: {e}")
        return False


def _connection_refresh_worker():
    """Background worker to periodically refresh database connection."""
    global _checkpointer, _last_connection_time
    logger.info("Starting database connection refresh worker")
    while not _refresh_stop_event.is_set():
        try:
            time.sleep(_refresh_interval)
            if _refresh_stop_event.is_set():
                break

            logger.info("Performing periodic database connection refresh")
            with _checkpointer_lock:
                if _checkpointer is not None:
                    # Test and potentially refresh the connection
                    if not _test_connection(_checkpointer):
                        logger.info("Connection refresh detected dead connection, creating new one")
                        _checkpointer = _create_checkpointer()
                    else:
                        logger.info("Connection refresh: connection is healthy")
                        # Update last connection time to extend the timeout
                        _last_connection_time = time.time()
        except Exception as e:
            logger.error(f"Error in connection refresh worker: {e}")

    logger.info("Database connection refresh worker stopped")


def _start_refresh_worker():
    """Start the background connection refresh worker."""
    global _refresh_thread
    if _refresh_thread is None or not _refresh_thread.is_alive():
        _refresh_stop_event.clear()
        _refresh_thread = threading.Thread(target=_connection_refresh_worker, daemon=True)
        _refresh_thread.start()
        logger.info("Started database connection refresh worker")


def _stop_refresh_worker():
    """Stop the background connection refresh worker."""
    global _refresh_thread
    if _refresh_thread and _refresh_thread.is_alive():
        _refresh_stop_event.set()
        _refresh_thread.join(timeout=5)
        logger.info("Stopped database connection refresh worker")


def get_checkpointer():
    """Get a working PostgresSaver instance with automatic reconnection."""
    global _checkpointer, _last_connection_time

    # Start the refresh worker if not already running
    _start_refresh_worker()

    with _checkpointer_lock:
        current_time = time.time()

        # Check if we need to create a new connection or test existing one
        if _checkpointer is None:
            logger.info("No checkpointer exists, creating new connection")
            _checkpointer = _create_checkpointer()
            _last_connection_time = current_time
            return _checkpointer

        # Check if connection is too old (Neon free tier timeout)
        if current_time - _last_connection_time > _connection_timeout:
            logger.info("Connection is older than timeout period, creating new connection")
            _checkpointer = _create_checkpointer()
            _last_connection_time = current_time
            return _checkpointer

        # Test if the current connection is still alive
        if not _test_connection(_checkpointer):
            logger.warning("Database connection is dead, creating new connection")
            _checkpointer = _create_checkpointer()
            _last_connection_time = current_time
            return _checkpointer

        # Connection is still good, update last connection time
        _last_connection_time = current_time
        return _checkpointer


def cleanup_on_exit():
    """Cleanup function to be called on application exit."""
    logger.info("Cleaning up database connections...")
    _stop_refresh_worker()
    # PostgresSaver doesn't have a close() method, so we just clear the reference
    global _checkpointer
    _checkpointer = None
    logger.info("Database connections cleaned up")


# Register cleanup function
atexit.register(cleanup_on_exit)
