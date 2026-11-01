import {
  Briefcase,
  Calculator,
  CalendarDays,
  ClipboardList,
  Columns3,
  Crop,
  Droplets,
  Eraser,
  FileImage,
  FileOutput,
  FileSignature,
  FileText,
  Files,
  GraduationCap,
  IdCard,
  Image as ImageIcon,
  Layers,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  NotebookPen,
  Percent,
  Timer,
  Type,
  QrCode,
  KeyRound,
  RefreshCcw,
  RotateCw,
  Scissors,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/lib/tools";

const ICONS: Record<IconKey, LucideIcon> = {
  minimize: Minimize2,
  maximize: Maximize2,
  crop: Crop,
  convert: RefreshCcw,
  idCard: IdCard,
  eraser: Eraser,
  sparkles: Sparkles,
  fileText: FileText,
  fileImage: FileImage,
  fileOutput: FileOutput,
  files: Files,
  scissors: Scissors,
  rotate: RotateCw,
  lock: Lock,
  droplets: Droplets,
  briefcase: Briefcase,
  pen: FileSignature,
  clipboard: ClipboardList,
  layers: Layers,
  checklist: ListChecks,
  graduation: GraduationCap,
  percent: Percent,
  calculator: Calculator,
  calendar: CalendarDays,
  timer: Timer,
  notebook: NotebookPen,
  columns: Columns3,
  type: Type,
  qr: QrCode,
  key: KeyRound,
};

export function ToolIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: IconKey;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? ImageIcon;
  return <Icon className={className} aria-hidden="true" />;
}
