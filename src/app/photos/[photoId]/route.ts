import type { NextRequest } from "next/server";

import { servePhoto } from "./serve";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/photos/[photoId]">,
) {
  const { photoId } = await context.params;
  return servePhoto(photoId, "full");
}
