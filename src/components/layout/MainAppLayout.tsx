import { LayoutShell } from "./LayoutShell";
import { MainSidebar } from "./MainSidebar";

export function MainAppLayout() {
  return <LayoutShell sidebar={<MainSidebar />} />;
}
