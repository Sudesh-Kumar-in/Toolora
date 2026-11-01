import type { ComponentType } from "react";
import WordCounter from "@/components/tools/word-counter";
import CgpaCalculator from "@/components/tools/cgpa-calculator";
import PasswordGenerator from "@/components/tools/password-generator";
import ImageCompressor from "@/components/tools/image-compressor";
import ImageResizer from "@/components/tools/image-resizer";
import ImageConverter from "@/components/tools/image-converter";
import ImagesToPdf from "@/components/tools/images-to-pdf";
import PdfMerger from "@/components/tools/pdf-merger";
import PdfSplitter from "@/components/tools/pdf-splitter";
import PdfCompressor from "@/components/tools/pdf-compressor";
import QrCodeGenerator from "@/components/tools/qr-code-generator";

/**
 * Register a tool here once its component is built. Tools missing from this
 * map show a "still being built" notice on their page instead of a fake UI.
 */
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "word-counter": WordCounter,
  "cgpa-calculator": CgpaCalculator,
  "password-generator": PasswordGenerator,
  "image-compressor": ImageCompressor,
  "image-resizer": ImageResizer,
  "image-converter": ImageConverter,
  "jpg-to-png": () => (
    <ImageConverter
      inputTypes={["image/jpeg"]}
      fixedTarget="image/png"
      note="Upload JPG photos to get lossless PNG files."
    />
  ),
  "png-to-jpg": () => (
    <ImageConverter
      inputTypes={["image/png"]}
      fixedTarget="image/jpeg"
      note="Upload PNG images to get smaller JPG files. Transparent areas become white."
    />
  ),
  "image-to-pdf": ImagesToPdf,
  "jpg-to-pdf": () => <ImagesToPdf inputTypes={["image/jpeg"]} />,
  "pdf-merger": PdfMerger,
  "pdf-splitter": PdfSplitter,
  "pdf-compressor": PdfCompressor,
  "qr-code-generator": QrCodeGenerator,
};
