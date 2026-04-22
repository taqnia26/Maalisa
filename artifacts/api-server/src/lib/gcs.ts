import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function parseGsPath(p: string): { bucket: string; prefix: string } {
  if (!p.startsWith("/")) throw new Error(`Invalid object path: ${p}`);
  const trimmed = p.slice(1);
  const idx = trimmed.indexOf("/");
  if (idx === -1) return { bucket: trimmed, prefix: "" };
  return { bucket: trimmed.slice(0, idx), prefix: trimmed.slice(idx + 1) };
}

export function getUploadsBucketAndPrefix(): { bucket: string; prefix: string } {
  const dir = process.env["PRIVATE_OBJECT_DIR"];
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR is not set; provision Object Storage first.");
  }
  const { bucket, prefix } = parseGsPath(dir);
  const uploadsPrefix = prefix ? `${prefix.replace(/\/+$/, "")}/uploads` : "uploads";
  return { bucket, prefix: uploadsPrefix };
}

export function getUploadsFile(name: string) {
  const { bucket, prefix } = getUploadsBucketAndPrefix();
  return objectStorageClient.bucket(bucket).file(`${prefix}/${name}`);
}
