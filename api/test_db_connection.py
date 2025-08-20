#!/usr/bin/env python3
"""
Test script to verify database connection management.
This script demonstrates the robust connection handling for Neon free tier.
"""

import os
import time

from dotenv import load_dotenv

from llm.connection_manager import _test_connection, cleanup_on_exit, get_checkpointer

load_dotenv()


def test_connection_management():
    """Test the database connection management system."""
    print("🧪 Testing Database Connection Management")
    print("=" * 50)

    # Test 1: Initial connection
    print("\n1. Testing initial connection...")
    try:
        checkpointer = get_checkpointer()
        if _test_connection(checkpointer):
            print("✅ Initial connection successful")
        else:
            print("❌ Initial connection failed")
            return False
    except Exception as e:
        print(f"❌ Initial connection error: {e}")
        return False

    # Test 2: Connection reuse
    print("\n2. Testing connection reuse...")
    try:
        checkpointer2 = get_checkpointer()
        if _test_connection(checkpointer2):
            print("✅ Connection reuse successful")
        else:
            print("❌ Connection reuse failed")
            return False
    except Exception as e:
        print(f"❌ Connection reuse error: {e}")
        return False

    # Test 3: Simulate connection testing
    print("\n3. Testing connection health check...")
    try:
        for i in range(3):
            print(f"   Test {i+1}/3: ", end="")
            if _test_connection(checkpointer):
                print("✅ Healthy")
            else:
                print("❌ Unhealthy")
            time.sleep(1)
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

    # Test 4: Simulate long-running scenario
    print("\n4. Simulating long-running scenario...")
    print("   (This will test the background refresh worker)")
    try:
        for i in range(10):
            print(f"   Iteration {i+1}/10: ", end="")
            checkpointer = get_checkpointer()
            if _test_connection(checkpointer):
                print("✅ Connection alive")
            else:
                print("❌ Connection dead")
            time.sleep(30)  # Wait 30 seconds between tests
    except KeyboardInterrupt:
        print("\n   ⏹️  Test interrupted by user")
    except Exception as e:
        print(f"❌ Long-running test error: {e}")
        return False

    print("\n✅ All tests completed successfully!")
    return True


def main():
    """Main test function."""
    print("🚀 Starting Database Connection Management Tests")
    print(f"📊 Database URL: {os.environ.get('DATABASE_URL', 'Not set')[:50]}...")

    try:
        success = test_connection_management()
        if success:
            print("\n🎉 All tests passed! Database connection management is working correctly.")
        else:
            print("\n💥 Some tests failed. Check the logs above for details.")
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {e}")
    finally:
        print("\n🧹 Cleaning up...")
        cleanup_on_exit()
        print("✅ Cleanup completed")


if __name__ == "__main__":
    main()
