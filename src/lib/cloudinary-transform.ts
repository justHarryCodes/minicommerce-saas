// Cloudinary URL transform helpers for mobile endpoints.
// Inserts transformation params into existing Cloudinary URLs so we serve
// correctly-sized images instead of the raw 1600px masters.
//
// Same pattern already used in /api/discover/reels/route.ts for video.

function insertTransform(url: string | null, transform: string): string | null {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

// Product thumbnail — card display is ~148px on mobile, 3× screens need ≤480px.
// f_auto picks WebP/AVIF automatically; q_auto:good is ~40% smaller than original.
export function mobileProductImage(url: string | null): string | null {
  return insertTransform(url, "f_auto,q_auto:good,w_480,c_limit");
}

// Store logo — largest display is 63px (story rings); 160px covers all 3× cases.
export function mobileStoreLogo(url: string | null): string | null {
  return insertTransform(url, "f_auto,q_auto:good,w_160,c_limit");
}

// Banner / hero image — wider than a card but still doesn't need the master.
export function mobileBannerImage(url: string | null): string | null {
  return insertTransform(url, "f_auto,q_auto:good,w_800,c_limit");
}
