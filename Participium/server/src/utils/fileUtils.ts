import { BadRequestError } from "@utils/utils";

// check min 1 and max 3 photos (story 5)
export function validatePhotosCount(files?: Express.Multer.File[]): void {
  if (!files || files.length < 1 || files.length > 3) {
    throw new BadRequestError("Error! Report must have between 1 and 3 photos.");
  }
}

// extract photo paths from uploaded files to store in DB fully
export function getPhotoPaths(files: Express.Multer.File[]): string[] {
  return files.map(file => `/uploads/reports/${file.filename}`);
}