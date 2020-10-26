# ATRONS backend
Materials can be of type BOOK, MAGAZINE, NEWSPAPER

## Admin endpoints  
### POST /api/v1/admin/users/provider
creates a provider (company or author)
author_info required if is_company == false
company_info required if is_company == true
returns the created provider document.

### POST /api/v1/admin/material
creates a material
returns the created material document.

### POST /api/v1/admin/upload/material
uploads a material
form file field name must be 'material'
response contains id, size, mimetype, contentType, url
url does not contain server_address/api/v1

### POST /api/v1/admin/upload/image
uploads an image (could be material cover, profile pic..)
form file field name must be 'image'
response contains id, size, mimetype, contentType, url
url does not contain server_address/api/v1

## Media endpoints
### GET /api/v1/media/images/:id
response is the image stored under :id or 404

### GET /api/v1/media/materials/:id
response is the material stored under :id or 404

