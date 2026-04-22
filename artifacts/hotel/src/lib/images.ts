// Hotel images served by the API server from /api/images
// Note: hotel-1.jpeg removed (contained portraits) — use images 2..10
export const hotelImages: string[] = Array.from({ length: 9 }, (_, i) => `/api/images/hotel-${i + 2}.jpeg`);

export function pickImage(index: number): string {
  return hotelImages[((index % hotelImages.length) + hotelImages.length) % hotelImages.length];
}
