import AWS from "aws-sdk";

const globalForS3 = globalThis as unknown as {
  s3: AWS.S3 | undefined;
};

export const s3 =
  globalForS3.s3 ??
  new AWS.S3({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

if (process.env.NODE_ENV !== "production") globalForS3.s3 = s3;

export default s3;
