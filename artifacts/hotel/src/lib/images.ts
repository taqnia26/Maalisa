// Hotel images served by the API server from /api/images
// Professional photos of the actual Nuzul Al-Ma'ali property

// Studio apartment photos
export const studioImages = [
  "/api/images/studio-01.png",
  "/api/images/studio-02.png",
  "/api/images/studio-03.png",
  "/api/images/studio-04.png",
];

// Deluxe suite photos (jacuzzi bathroom + wardrobe + blue-lit bedroom)
export const suite1Images = [
  "/api/images/suite1-01.png",
  "/api/images/suite1-02.png",
  "/api/images/suite1-03.png",
  "/api/images/suite1-04.png",
];

// Royal / Diplomatic suite photos (large living room + glass bathroom)
export const suite2Images = [
  "/api/images/suite2-01.png",
  "/api/images/suite2-02.png",
  "/api/images/suite2-03.png",
  "/api/images/suite2-04.png",
];

// All hotel interior images for galleries / lightboxes
export const hotelImages: string[] = [
  ...studioImages,
  ...suite1Images,
  ...suite2Images,
];

export const exteriorImage = "/api/images/nuzul-exterior.png";

export function pickImage(index: number): string {
  return hotelImages[((index % hotelImages.length) + hotelImages.length) % hotelImages.length];
}
