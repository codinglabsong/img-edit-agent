# API Test

This directory contains comprehensive tests for the API functionality.

## Test Structure

- `test_agent.py` - Tests for the LLM agent functionality
- `test_api.py` - Tests for the FastAPI endpoints
- `test_utils.py` - Tests for S3 utility functions
- `test_db_connection.py` - Tests for database connection management

## Running Tests

### Quick Tests (Recommended for CI/CD)

```bash
# From project root
pnpm test:api

# Or directly
cd api
pytest tests/ -v -m "not database"
```

### All Tests (Including Database)

```bash
# From project root
pnpm test:api:all

# Or directly
cd api
pytest tests/ -v
```

### Database Tests Only

```bash
# From project root
pnpm test:api:db

# Or directly
cd api
pytest tests/ -v -m "database"
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
- **Database Tests**: Test database connection and management (marked with `@pytest.mark.database`)

## Test Environment

Tests use mocked external services (S3, LLM, Database) to ensure:

- ⚡ Fast execution (~2 seconds for non-database tests)
- 🔒 No external dependencies
- ✅ Consistent results
- 💰 No costs incurred

## GitHub Actions Integration

Tests are automatically run in GitHub Actions:

1. **Pull Requests**: All tests run to catch issues early
2. **Deployment**: Tests must pass before deploying to Hugging Face Spaces
3. **Coverage**: Test coverage is tracked and reported

## Adding New Tests

1. Create test file: `test_<module_name>.py`
2. Follow naming convention: `test_<function_name>`
3. Use descriptive test names
4. Mock external dependencies
5. Test both success and error cases
6. Mark database tests with `@pytest.mark.database`
