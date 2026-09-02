# Coolify S3 Setup Guide (MinIO)

If Gmail's strict image proxy is still blocking images served directly from the LMS backend, migrating to an S3-compatible storage service is the best solution. MinIO is a high-performance, S3-compatible object storage server that you can easily host directly on your Coolify instance.

Here is the step-by-step guide to setting up MinIO on Coolify and connecting it to LearnHouse.

## Step 1: Deploy MinIO on Coolify

1. **Log in to your Coolify Dashboard.**
2. Go to your **Project** and select the **Environment** where LearnHouse is deployed.
3. Click **+ New Resource** and select **Service** (or "One-click App").
4. Search for **MinIO** and select it.
5. In the configuration for MinIO:
   - **Domain:** Assign a public subdomain for your storage (e.g., `https://s3.africanainetwork.com`). _Ensure you have pointed this subdomain's DNS A/CNAME record to your Coolify server's IP._
   - **Root User:** Note down the default root user (this will be your Access Key).
   - **Root Password:** Note down the default password (this will be your Secret Key).
6. Click **Deploy**.

## Step 2: Create the `learnhouse-media` Bucket

Once MinIO is successfully deployed and running:

1. Navigate to your new MinIO web interface (e.g., `https://s3.africanainetwork.com`).
2. Log in using the **Root User** and **Root Password** you noted earlier.
3. Go to the **Buckets** tab on the left menu.
4. Click **Create Bucket**.
5. Name the bucket exactly: `learnhouse-media`
6. **CRITICAL STEP:** Go to the settings of the `learnhouse-media` bucket, find the **Access Policy** (or Security), and set it to **Public** (or `Public Read`).
   - _If the bucket is not public, Gmail will absolutely not be able to load the images._

## Step 3: Connect LearnHouse to MinIO

Now you need to tell your LearnHouse backend to stop using the local filesystem and start using your new S3 instance.

1. Go back to the **Coolify Dashboard**.
2. Select your **LearnHouse Backend** resource (e.g., `lms-backend`).
3. Go to the **Environment Variables** tab.
4. Add or update the following variables exactly as shown:

```env
LEARNHOUSE_CONTENT_DELIVERY_TYPE=s3api
LEARNHOUSE_S3_API_BUCKET_NAME=learnhouse-media
LEARNHOUSE_S3_API_ENDPOINT_URL=https://s3.africanainetwork.com
AWS_ACCESS_KEY_ID=<your-minio-root-user>
AWS_SECRET_ACCESS_KEY=<your-minio-root-password>
AWS_REGION=us-east-1
```

_(Note: MinIO defaults to `us-east-1` for region compatibility, even if hosted elsewhere)._

5. Save the variables and **Restart** the LearnHouse backend container.

## Step 4: Verify the Setup

1. Go to the LearnHouse dashboard and upload a new image in the Marketing Email tab.
2. The image will now upload directly to your MinIO bucket.
3. The image URL generated will look like: `https://s3.africanainetwork.com/learnhouse-media/content/...`
4. Because it is being served natively by an S3 protocol with standard cache-control headers, Gmail's proxy will instantly trust and render it!
