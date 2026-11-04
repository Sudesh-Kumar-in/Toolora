import type { ComponentType } from "react";
import PdfEditor from "@/components/tools/pdf-editor";
import ImageCropper from "@/components/tools/image-cropper";
import PassportPhotoMaker from "@/components/tools/passport-photo-maker";
import PhotoEnhancer from "@/components/tools/photo-enhancer";
import BackgroundRemover from "@/components/tools/background-remover";
import PdfToJpg from "@/components/tools/pdf-to-jpg";
import PdfLockUnlock from "@/components/tools/pdf-lock-unlock";
import PdfToWord from "@/components/tools/pdf-to-word";
import ResumeBuilder from "@/components/tools/resume-builder";
import CvMaker from "@/components/tools/cv-maker";
import CoverLetterGenerator from "@/components/tools/cover-letter-generator";
import ResumeTemplates from "@/components/tools/resume-templates";
import PercentageCalculator from "@/components/tools/percentage-calculator";
import GpaCalculator from "@/components/tools/gpa-calculator";
import MarksCalculator from "@/components/tools/marks-calculator";
import AgeCalculator from "@/components/tools/age-calculator";
import ScientificCalculator from "@/components/tools/scientific-calculator";
import TodoList from "@/components/tools/todo-list";
import PomodoroTimer from "@/components/tools/pomodoro-timer";
import DailyPlanner from "@/components/tools/daily-planner";
import NotesManager from "@/components/tools/notes-manager";
import KanbanBoard from "@/components/tools/kanban-board";
import JobApplicationTracker from "@/components/tools/job-application-tracker";
import PdfRotator from "@/components/tools/pdf-rotator";
import PdfWatermark from "@/components/tools/pdf-watermark";
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

/** Every registered tool. tests/registry.test.mts checks this matches lib/tools.ts. */
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
  "percentage-calculator": PercentageCalculator,
  "gpa-calculator": GpaCalculator,
  "marks-calculator": MarksCalculator,
  "age-calculator": AgeCalculator,
  "scientific-calculator": ScientificCalculator,
  "todo-list": TodoList,
  "pomodoro-timer": PomodoroTimer,
  "daily-planner": DailyPlanner,
  "notes-manager": NotesManager,
  "kanban-board": KanbanBoard,
  "job-application-tracker": JobApplicationTracker,
  "pdf-page-rotator": PdfRotator,
  "pdf-watermark": PdfWatermark,
  "image-cropper": ImageCropper,
  "passport-photo-maker": PassportPhotoMaker,
  "photo-enhancer": PhotoEnhancer,
  "background-remover": BackgroundRemover,
  "pdf-to-jpg": PdfToJpg,
  "pdf-lock-unlock": PdfLockUnlock,
  "pdf-to-word": PdfToWord,
  "resume-builder": ResumeBuilder,
  "cv-maker": CvMaker,
  "cover-letter-generator": CoverLetterGenerator,
  "resume-templates": ResumeTemplates,
  "pdf-editor": PdfEditor,
};
