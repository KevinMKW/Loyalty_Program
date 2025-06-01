# Docker Setup for Elysian Loyalty Program

This guide will help you run the Elysian Loyalty Program using Docker containers.

## Prerequisites

Make sure you have Docker and Docker Compose installed on your system:
- [Install Docker](https://docs.docker.com/get-docker/)
- [Install Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

1. **Clone/Navigate to your project directory** containing all the files
2. **Build and start the containers:**
   ```bash
   docker-compose up --build
   ```

3. **Access your application:**
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health
   - PostgreSQL: localhost:5432

## Docker Commands

### Start the application
```bash
# Start in foreground (see logs)
docker-compose up

# Start in background (detached)
docker-compose up -d

# Build and start (when you make changes)
docker-compose up --build
```

### Stop the application
```bash
# Stop containers
docker-compose down

# Stop and remove volumes (WARNING: This deletes your database data)
docker-compose down -v
```

### View logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs app
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f app
```

### Access containers
```bash
# Access the app container
docker-compose exec app sh

# Access the database container
docker-compose exec postgres psql -U postgres -d elysian_loyalty
```

## File Structure

After adding Docker, your project structure should look like:

```
elysian-loyalty-program/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── server.js
├── package.json
├── Database.sql
└── ... (other project files)
```

## Environment Variables

The application uses these environment variables (configured in docker-compose.yml):

- `NODE_ENV`: Set to 'production'
- `DB_HOST`: Database host (set to 'postgres' for Docker)
- `DB_PORT`: Database port (5432)
- `DB_NAME`: Database name (elysian_loyalty)
- `DB_USER`: Database user (postgres)
- `DB_PASSWORD`: Database password (@Admin2025)

## Database

- PostgreSQL 15 is used as the database
- The database is automatically initialized with your `Database.sql` schema
- Data is persisted in a Docker volume named `postgres_data`
- Database is accessible on localhost:5432

## Networking

- Both containers are connected via a custom Docker network (`elysian-network`)
- The app waits for the database to be healthy before starting
- External access is available through port mapping

## Health Checks

The application includes a health check endpoint at `/health` that:
- Verifies database connectivity
- Returns status information
- Helps Docker Compose ensure services are ready

## Troubleshooting

### Database Connection Issues
```bash
# Check if database is running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres pg_isready -U postgres
```

### Application Issues
```bash
# Check app logs
docker-compose logs app

# Restart just the app
docker-compose restart app

# Rebuild the app
docker-compose up --build app
```

### Reset Everything
```bash
# Stop and remove everything (including data)
docker-compose down -v
docker-compose up --build
```

## Development vs Production

### Development (current setup)
- Code changes require container rebuild
- Database data persists between restarts
- Logs are visible in console

### For Production (additional considerations)
- Use environment files (.env)
- Set up proper secrets management
- Configure log aggregation
- Set up monitoring and health checks
- Use production-grade reverse proxy (nginx)
- Implement backup strategies

## Customization

To modify the Docker setup:

1. **Change database credentials**: Update `docker-compose.yml` environment variables
2. **Add new services**: Add them to `docker-compose.yml`
3. **Modify ports**: Change port mappings in `docker-compose.yml`
4. **Add environment variables**: Update the environment section in `docker-compose.yml`

## Data Persistence

Your database data is stored in a Docker volume and will persist even if you restart containers. To completely reset:

```bash
docker-compose down -v  # WARNING: This deletes all data
docker-compose up --build
```