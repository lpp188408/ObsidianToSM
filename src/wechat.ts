import type { WechatMetadata } from "./metadata";

export interface WechatResponse {
  json: Record<string, unknown>;
}

export type WechatRequester = (request: {
  url: string;
  method: "GET" | "POST";
  contentType?: string;
  body?: string | ArrayBuffer;
}) => Promise<WechatResponse>;

export interface WechatUploadFile {
  bytes: ArrayBuffer;
  filename: string;
  mimeType: string;
}

export interface WechatDraftArticle {
  title: string;
  author: string;
  digest: string;
  content: string;
  thumbMediaId: string;
  needOpenComment: boolean;
  onlyFansCanComment: boolean;
}

export interface WechatDraftPublishInput {
  appId: string;
  appSecret: string;
  requester: WechatRequester;
  html: string;
  metadata: WechatMetadata;
  cover?: WechatUploadFile;
  thumbMediaId: string;
}

export interface WechatImageDraftInput {
  appId: string;
  appSecret: string;
  requester: WechatRequester;
  title: string;
  description: string;
  images: WechatUploadFile[];
  needOpenComment: boolean;
  onlyFansCanComment: boolean;
}

export type WechatPublishStatus = "published" | "reviewing" | "failed" | "rejected";
export interface WechatPublishResult { draftMediaId: string; publishId: string; status: WechatPublishStatus; }
export interface WechatPublishPollingOptions {
  maxPollAttempts?: number;
  pollIntervalMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
}

export class WechatClient {
  private accessToken?: string;

  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly requester: WechatRequester
  ) {}

  async uploadArticleImage(file: WechatUploadFile): Promise<string> {
    const response = await this.requestMultipart("cgi-bin/media/uploadimg", file);
    const url = response.json.url;
    if (typeof url !== "string") throwWechatError(response.json, "上传正文图片失败");
    return url;
  }

  async uploadCover(file: WechatUploadFile): Promise<string> {
    const response = await this.requestMultipart("cgi-bin/material/add_material", file, "type=image");
    const mediaId = response.json.media_id;
    if (typeof mediaId !== "string") throwWechatError(response.json, "上传封面失败");
    return mediaId;
  }

  async addDraft(article: WechatDraftArticle): Promise<string> {
    const token = await this.getAccessToken();
    const response = await this.requester({
      url: `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        articles: [{
          title: article.title,
          author: article.author,
          digest: article.digest,
          content: article.content,
          thumb_media_id: article.thumbMediaId,
          need_open_comment: article.needOpenComment ? 1 : 0,
          only_fans_can_comment: article.onlyFansCanComment ? 1 : 0
        }]
      })
    });
    const mediaId = response.json.media_id;
    if (typeof mediaId !== "string") throwWechatError(response.json, "创建草稿失败");
    return mediaId;
  }

  async addImageDraft(input: Omit<WechatImageDraftInput, "appId" | "appSecret" | "requester" | "images"> & { imageMediaIds: string[] }): Promise<string> {
    const token = await this.getAccessToken();
    const response = await this.requester({
      url: `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        articles: [{
          article_type: "newspic",
          title: input.title,
          content: input.description,
          need_open_comment: input.needOpenComment ? 1 : 0,
          only_fans_can_comment: input.onlyFansCanComment ? 1 : 0,
          image_info: { image_list: input.imageMediaIds.map((imageMediaId) => ({ image_media_id: imageMediaId })) }
        }]
      })
    });
    const mediaId = response.json.media_id;
    if (typeof mediaId !== "string") throwWechatError(response.json, "创建图片草稿失败");
    return mediaId;
  }

  async submitPublish(mediaId: string): Promise<string> {
    const response = await this.postJson("cgi-bin/freepublish/submit", { media_id: mediaId });
    const publishId = response.json.publish_id;
    if (typeof publishId !== "string") throwWechatError(response.json, "提交发布失败");
    return publishId;
  }

  async getPublishStatus(publishId: string): Promise<WechatPublishStatus> {
    const response = await this.postJson("cgi-bin/freepublish/get", { publish_id: publishId });
    return mapPublishStatus(response.json.publish_status, response.json);
  }

  private async postJson(path: string, body: Record<string, unknown>): Promise<WechatResponse> {
    const token = await this.getAccessToken();
    return this.requester({ url: `https://api.weixin.qq.com/${path}?access_token=${encodeURIComponent(token)}`, method: "POST", contentType: "application/json", body: JSON.stringify(body) });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    const response = await this.requester({
      url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(this.appId)}&secret=${encodeURIComponent(this.appSecret)}`,
      method: "GET"
    });
    const accessToken = response.json.access_token;
    if (typeof accessToken !== "string") throwWechatError(response.json, "获取 access_token 失败");
    this.accessToken = accessToken;
    return accessToken;
  }

  private async requestMultipart(path: string, file: WechatUploadFile, query = ""): Promise<WechatResponse> {
    const token = await this.getAccessToken();
    const boundary = `----ObsidianToSm${Date.now().toString(36)}`;
    const suffix = query ? `&${query}` : "";
    return this.requester({
      url: `https://api.weixin.qq.com/${path}?access_token=${encodeURIComponent(token)}${suffix}`,
      method: "POST",
      contentType: `multipart/form-data; boundary=${boundary}`,
      body: buildMultipartBody(boundary, file)
    });
  }
}

export async function replaceDataUrlImages(
  html: string,
  upload: (file: WechatUploadFile) => Promise<string>
): Promise<string> {
  const pattern = /(<img\b[^>]*\bsrc=")(data:[^"]+)("[^>]*>)/gi;
  let imageIndex = 0;
  let result = "";
  let cursor = 0;

  for (const match of html.matchAll(pattern)) {
    const index = match.index ?? 0;
    result += html.slice(cursor, index);
    imageIndex += 1;
    const file = dataUrlToUploadFile(match[2], `image-${imageIndex}`);
    result += `${match[1]}${await upload(file)}${match[3]}`;
    cursor = index + match[0].length;
  }
  return result + html.slice(cursor);
}

export async function publishWechatDraft(input: WechatDraftPublishInput): Promise<string> {
  if (!input.appId || !input.appSecret) throw new Error("请先在插件设置中配置 AppID 和 AppSecret");
  if (!input.cover && !input.thumbMediaId) {
    throw new Error("请在右侧工作台选择本地封面，或在插件设置中填写封面 thumb_media_id");
  }

  const client = new WechatClient(input.appId, input.appSecret, input.requester);
  return createDraft(client, input);
}

export async function publishWechatImageDraft(input: WechatImageDraftInput): Promise<string> {
  if (!input.appId || !input.appSecret) throw new Error("请先在插件设置中配置 AppID 和 AppSecret");
  if (input.images.length === 0) throw new Error("至少需要一张贴图");
  if (input.images.length > 20) throw new Error("公众号贴图最多支持 20 张图片");
  if ([...input.title].length > 32) throw new Error("公众号贴图标题不能超过 32 个字");
  if ([...input.description].length > 20000) throw new Error("公众号贴图描述不能超过 20000 个字符");
  const client = new WechatClient(input.appId, input.appSecret, input.requester);
  const imageMediaIds: string[] = [];
  for (const image of input.images) imageMediaIds.push(await client.uploadCover(image));
  return client.addImageDraft({
    title: input.title,
    description: input.description,
    needOpenComment: input.needOpenComment,
    onlyFansCanComment: input.onlyFansCanComment,
    imageMediaIds
  });
}

export async function publishWechatArticle(input: WechatDraftPublishInput, options: WechatPublishPollingOptions = {}): Promise<WechatPublishResult> {
  if (!input.appId || !input.appSecret) throw new Error("请先在插件设置中配置 AppID 和 AppSecret");
  if (!input.cover && !input.thumbMediaId) throw new Error("请在右侧工作台选择本地封面，或在插件设置中填写封面 thumb_media_id");
  const client = new WechatClient(input.appId, input.appSecret, input.requester);
  const draftMediaId = await createDraft(client, input);
  const publishId = await client.submitPublish(draftMediaId);
  const maxPollAttempts = options.maxPollAttempts ?? 10;
  const pollIntervalMs = options.pollIntervalMs ?? 1500;
  const wait = options.wait ?? delay;
  let status = await client.getPublishStatus(publishId);
  for (let attempt = 1; status === "reviewing" && attempt < maxPollAttempts; attempt += 1) {
    await wait(pollIntervalMs);
    status = await client.getPublishStatus(publishId);
  }
  return { draftMediaId, publishId, status };
}

async function createDraft(client: WechatClient, input: WechatDraftPublishInput): Promise<string> {
  const content = await replaceDataUrlImages(input.html, (file) => client.uploadArticleImage(file));
  const thumbMediaId = input.cover ? await client.uploadCover(input.cover) : input.thumbMediaId;
  return client.addDraft({
    title: input.metadata.title,
    author: input.metadata.author,
    digest: input.metadata.digest,
    content,
    thumbMediaId,
    needOpenComment: input.metadata.needOpenComment,
    onlyFansCanComment: input.metadata.onlyFansCanComment
  });
}

function mapPublishStatus(value: unknown, response: Record<string, unknown>): WechatPublishStatus {
  if (value === 0) return "published";
  if (value === 1) return "reviewing";
  if (value === 2 || value === 3 || value === 5 || value === 6) return "failed";
  if (value === 4) return "rejected";
  throwWechatError(response, "查询发布状态失败");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function dataUrlToUploadFile(dataUrl: string, baseName: string): WechatUploadFile {
  const match = dataUrl.match(/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("图片不是可上传的 base64 data URL");
  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes: bytes.buffer, filename: `${baseName}.${extensionForMime(mimeType)}`, mimeType };
}

function buildMultipartBody(boundary: string, file: WechatUploadFile): ArrayBuffer {
  const encoder = new TextEncoder();
  const start = encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${escapeHeader(file.filename)}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`);
  const end = encoder.encode(`\r\n--${boundary}--\r\n`);
  const fileBytes = new Uint8Array(file.bytes);
  const body = new Uint8Array(start.length + fileBytes.length + end.length);
  body.set(start, 0);
  body.set(fileBytes, start.length);
  body.set(end, start.length + fileBytes.length);
  return body.buffer;
}

function extensionForMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp"
  };
  return extensions[mimeType] ?? "png";
}

function escapeHeader(value: string): string {
  return value.replaceAll('"', "_").replaceAll("\r", "_").replaceAll("\n", "_");
}

function throwWechatError(response: Record<string, unknown>, fallback: string): never {
  const code = typeof response.errcode === "number" ? `（${response.errcode}）` : "";
  const message = typeof response.errmsg === "string" ? response.errmsg : fallback;
  throw new Error(`${message}${code}`);
}
