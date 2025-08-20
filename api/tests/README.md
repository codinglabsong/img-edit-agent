# API Tests

This directory contains comprehensive tests for the API functionality.

## Test Structure

- `test_agent.py` - Tests for the LLM agent functionality
- `test_api.py` - Tests for the FastAPI endpoints
- `test_utils.py` - Tests for S3 utility functions

## Running Tests

### Run All Tests

```bash
cd api
pytest tests/ -v
```

### Run Specific Test File

```bash
cd api
pytest tests/test_agent.py -v
```

### Run with Coverage

```bash
cd api
pytest tests/ --cov=llm --cov=server --cov-report=html
```

## Test Categories

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and data flow
- **Error Handling**: Test error scenarios and edge cases

## Test Environment

Tests use mocked external services (S3, LLM) to ensure:

- Fast execution
- No external dependencies
- Consistent results
- No costs incurred

## Adding New Tests

1. Create test file: `test_<module_name>.py`
2. Follow naming convention: `test_<function_name>`
3. Use descriptive test names
4. Mock external dependencies
5. Test both success and error cases
