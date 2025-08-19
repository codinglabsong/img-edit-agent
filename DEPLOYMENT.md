# Deployment Guide: GitHub Actions to Hugging Face Spaces

This guide explains how to set up automatic deployment of your API to Hugging Face Spaces using GitHub Actions.

## Prerequisites

1. **Hugging Face Account**: Create an account at [huggingface.co](https://huggingface.co)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Hugging Face Access Token**: Generate a token with write permissions

## Step 1: Create Hugging Face Access Token

1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Give it a name (e.g., "GitHub Actions Deploy")
4. Select "Write" permissions
5. Copy the token (you'll need it for GitHub secrets)

## Step 2: Set Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Add these secrets:

### Required Secrets:

| Secret Name    | Value                                 | Description                                                  |
| -------------- | ------------------------------------- | ------------------------------------------------------------ |
| `HF_TOKEN`     | `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Your Hugging Face access token                               |
| `HF_SPACE_URL` | `yourusername/your-space-name`        | Your Hugging Face space URL (without huggingface.co/spaces/) |

### Example:

- `HF_TOKEN`: `hf_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`
- `HF_SPACE_URL`: `johndoe/ai-image-editor-api`

## Git-based Deployment

- **File**: `.github/workflows/deploy-api.yml`
- **Pros**: More reliable, handles large files better
- **Cons**: Requires git operations

The workflow will automatically trigger when you:

- Push to `main` or `master` branch
- Make changes to files in the `api/` directory
- Manually trigger via GitHub Actions UI

## Step 5: Test the Deployment

1. Make a small change to a file in the `api/` directory
2. Commit and push to your main branch
3. Go to **Actions** tab in your GitHub repository
4. Watch the workflow run
5. Check your Hugging Face Space URL: `https://huggingface.co/spaces/YOUR_SPACE_URL`

## Workflow Features

### Automatic Triggers

- ✅ Push to main/master branch
- ✅ Changes to `api/` directory only
- ✅ Manual trigger option

### Testing

- ✅ Installs dependencies
- ✅ Runs tests (if available)
- ✅ Validates the build

### Deployment

- ✅ Creates necessary files for Hugging Face Spaces
- ✅ Generates `requirements.txt` from `pyproject.toml`
- ✅ Creates `app.py` entry point
- ✅ Adds documentation

## Troubleshooting

### Common Issues:

1. **Authentication Error**
   - Check your `HF_TOKEN` secret
   - Ensure token has write permissions

2. **Space URL Error**
   - Verify `HF_SPACE_URL` format: `username/space-name`
   - Don't include `huggingface.co/spaces/`

3. **Build Failures**
   - Check the Actions logs for specific errors
   - Ensure all dependencies are in `pyproject.toml`

4. **File Upload Issues**
   - Try the git-based workflow instead of CLI
   - Check file size limits

### Manual Deployment

If you need to deploy manually:

```bash
# Clone your repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo/api

# Install dependencies
pip install uv
uv pip install --system .

# Create deployment files (same as workflow)
# ... (see workflow file for details)

# Deploy to Hugging Face
huggingface-cli login --token YOUR_TOKEN
huggingface-cli upload YOUR_SPACE_URL app.py app.py
# ... upload other files
```

## Monitoring

- **GitHub Actions**: Check the Actions tab for deployment status
- **Hugging Face**: Monitor your space at `https://huggingface.co/spaces/YOUR_SPACE_URL`
- **Health Check**: Test your API at `https://huggingface.co/spaces/YOUR_SPACE_URL/health`

## Environment Variables

Your deployed API will have access to these environment variables:

- `PORT`: Server port (set by Hugging Face)
- Any additional variables you configure in Hugging Face Space settings

## Security Notes

- ✅ Access tokens are stored as GitHub secrets (encrypted)
- ✅ Tokens have minimal required permissions
- ✅ Workflows only run on main/master branch
- ✅ No sensitive data in logs

## Next Steps

1. Set up your secrets
2. Choose a workflow file
3. Make a test commit
4. Monitor the deployment
5. Update your frontend to use the new API URL

Your API will be automatically deployed every time you push changes to the `api/` directory! 🚀
