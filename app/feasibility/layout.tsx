import { GlobalProvider } from "@/components/GlobalContext";
import "../../styles/scoped-bootstrap.css";
import "@/components/feasibility_agent/index.css";

export default function FeasibilityLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalProvider>
      <div className="bootstrap-scope">
        {children}
      </div>
    </GlobalProvider>
  );
}
