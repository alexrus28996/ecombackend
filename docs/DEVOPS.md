# DevOps Guide

## PM2
Create `ecosystem.config.js`:
```
module.exports = {
  apps: [
    {
      name: 'ecombackend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Run:
```
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Reverse Proxy (Nginx)
Example server block:
```
server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:4001;
  }
}
```

## Stripe Webhooks in Prod
Use a public HTTPS endpoint for `/api/payments/stripe/webhook`. Set `STRIPE_WEBHOOK_SECRET` accordingly.

## Environment
See `.env.example` for all configuration flags. Use `CSP_ENABLED=true` with CSP overrides as needed.

