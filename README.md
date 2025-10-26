# Coner Backend API Documentation

This folder contains the OpenAPI/Swagger documentation for the Coner Backend API.

## Files

- **`openapi.yaml`** - OpenAPI 3.0 specification defining all API endpoints, schemas, and authentication
- **`index.html`** - Swagger UI interface for interactive API documentation
- **`README.md`** - This file with setup and deployment instructions

## Local Development

### View Documentation Locally

1. **Option 1: Use a local HTTP server**

   Using Python 3:
   ```bash
   cd api
   python3 -m http.server 8000
   ```

   Using Node.js (http-server):
   ```bash
   cd api
   npx http-server -p 8000
   ```

   Then open http://localhost:8000 in your browser.

2. **Option 2: Use VS Code Live Server**

   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

### Edit the API Specification

1. Edit `openapi.yaml` to update API endpoints, schemas, or documentation
2. The Swagger UI will automatically reload and reflect your changes
3. Validate your OpenAPI spec using:
   - [Swagger Editor](https://editor.swagger.io/) - paste your YAML
   - [OpenAPI Validator](https://apitools.dev/swagger-parser/online/)

## GitHub Pages Deployment

### One-Time Setup

1. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Navigate to **Settings** > **Pages**
   - Under "Source", select the branch (e.g., `main` or `dev`)
   - Select the folder: `/` (root) or `/docs` depending on your setup
   - Click **Save**

2. **Configure for subfolder deployment (if needed)**

   If deploying from the `api/` folder isn't directly supported, you have two options:

   **Option A: Move to docs folder**
   ```bash
   # Create docs folder and move API docs
   mkdir -p docs
   cp -r api/* docs/
   git add docs
   git commit -m "Add API documentation for GitHub Pages"
   git push
   ```
   Then set GitHub Pages source to `/docs` folder.

   **Option B: Use GitHub Actions**

   Create `.github/workflows/deploy-api-docs.yml`:
   ```yaml
   name: Deploy API Documentation

   on:
     push:
       branches: [main, dev]
       paths:
         - 'api/**'

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Setup Pages
           uses: actions/configure-pages@v4

         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: './api'

         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```

### Access Your Documentation

Once deployed, your API documentation will be available at:

```
https://<your-username>.github.io/<repository-name>/
```

For example:
- `https://vneseyoungster.github.io/Coner-Frontend-Master/`

If deployed to a subfolder:
- `https://vneseyoungster.github.io/Coner-Frontend-Master/api/`

## Customization

### Update API Base URL

Edit `openapi.yaml` to change the server URLs:

```yaml
servers:
  - url: http://localhost:8080
    description: Development server
  - url: https://api.coner.app
    description: Production server
```

### Change Color Theme

Edit `index.html` and modify the CSS in the `<style>` section:

```css
.swagger-ui .topbar {
    background-color: #1a1a2e;  /* Change this color */
}
```

### Add Custom Logo

Replace the title in `index.html`:

```html
<h2 class="api-title">
    <img src="your-logo.png" alt="Coner" class="custom-logo">
</h2>
```

## Features

### Interactive Documentation

- **Try It Out**: Test API endpoints directly from the browser
- **Authentication**: Supports Bearer token authentication
- **Code Examples**: Auto-generated code samples in multiple languages
- **Schema Validation**: Real-time validation of request/response schemas

### Search and Filter

Use the search box in Swagger UI to quickly find endpoints by:
- Endpoint path (e.g., `/auth/signin`)
- HTTP method (e.g., `POST`)
- Tag name (e.g., `Authentication`)
- Description text

### Dark Mode

Swagger UI uses a monokai syntax highlighting theme for code examples.

## Maintenance

### Keeping Documentation Updated

1. Update `openapi.yaml` whenever you modify the backend API
2. Ensure all new endpoints are documented
3. Update version number in the `info` section:
   ```yaml
   info:
     version: 0.5.0  # Increment this
   ```
4. Commit and push changes to trigger GitHub Pages rebuild

### Validation Best Practices

Before deploying changes:

1. **Validate YAML syntax**
   ```bash
   # Using yamllint (install: pip install yamllint)
   yamllint openapi.yaml
   ```

2. **Validate OpenAPI spec**
   - Use [Swagger Editor](https://editor.swagger.io/)
   - Check for errors in the right panel
   - Ensure all `$ref` references are valid

3. **Test locally first**
   - Run local server and verify all endpoints appear correctly
   - Test "Try It Out" functionality with sample requests

## Troubleshooting

### Issue: Documentation not updating on GitHub Pages

**Solution:**
- Wait 5-10 minutes for GitHub Pages to rebuild
- Check GitHub Actions tab for build status
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache

### Issue: CORS errors when testing API

**Solution:**
This is expected when testing from GitHub Pages against localhost.
- Use browser extensions like "CORS Unblock"
- Or test against production API URL
- Or run Swagger UI locally

### Issue: OpenAPI spec not loading

**Solution:**
- Check browser console for errors
- Verify `openapi.yaml` is accessible at the correct URL
- Ensure YAML is valid (no syntax errors)

### Issue: 404 on GitHub Pages

**Solution:**
- Verify GitHub Pages is enabled in repository settings
- Check that files are in the correct folder
- Ensure branch is correct (main/dev)
- Wait a few minutes after first deployment

## Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [OpenAPI Generator](https://openapi-generator.tech/) - Generate client SDKs

## Support

For issues or questions:
- Create an issue on GitHub
- Contact the Coner Development Team
- Refer to the main API Reference: `../docs/API_REFERENCE.md`

---

**Maintained by**: Coner Development Team
**Last Updated**: 2025-10-26
**API Version**: 0.4.0
