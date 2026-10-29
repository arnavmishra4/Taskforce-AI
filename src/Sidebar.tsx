// The app's left modules bar (TFSidebar in taskforce-construction-frontend), as an Admin sees it: the same items,
// icons, order and styles. Nothing here navigates; the demo opens a module's sub-menu to point at it.
import styles from "./sidebar.module.css";
import item from "./sidebarItem.module.css";

type Module = { label: string; icon: string; subItems?: string[] };

export const MODULES: Module[] = [
  { label: "Dashboard", icon: "/images/Dashboard_Nav.svg" },
  { label: "Projects", icon: "/images/Projects_Nav.svg", subItems: ["Tender", "SP Provisions", "NCRs", "RFIs", "Lessons Learned"] },
  { label: "Daily Site Report", icon: "/images/Tasks_Nav.svg", subItems: ["Report Generation", "AI DSR"] },
  { label: "RFI", icon: "/icons/RFI_black.svg", subItems: ["RFI Register [Global]"] },
  { label: "NCR", icon: "/images/Tasks_Nav.svg", subItems: ["Trend Analytics"] },
  { label: "Change Order", icon: "/icons/Change_Order_Black.svg", subItems: ["Pipeline"] },
  { label: "Risk Management", icon: "/icons/RM_Black.svg", subItems: ["Register"] },
  { label: "Quality Control", icon: "/images/Tasks_Nav.svg", subItems: ["Design QC"] },
  { label: "Scheduling", icon: "/images/Projects_Nav.svg" },
  { label: "Schedule & Resources", icon: "/images/Projects_Nav.svg", subItems: ["Dashboard"] },
  { label: "Document Control", icon: "/images/Projects_Nav.svg", subItems: ["Dashboard"] },
  { label: "Finance", icon: "/icons/finance_sidebar_icon.svg", subItems: ["Daily P&L Report"] },
  { label: "Budgets", icon: "/images/Budgets_Nav.svg" },
  { label: "RFP", icon: "/images/Rfp_Nav.svg" },
  { label: "Proposals", icon: "/images/Proposal_Nav.svg" },
  { label: "Proposals New", icon: "/images/Proposal_Nav.svg", subItems: ["Discover"] },
  { label: "Contacts", icon: "/icons/Clients_icon.svg", subItems: ["Organizations", "People"] },
  { label: "Employees", icon: "/images/Employees_Nav.svg" },
  { label: "Tasks", icon: "/images/Tasks_Nav.svg" },
  { label: "Timesheet", icon: "/icons/timesheets_sidebar_icon.svg", subItems: ["Timesheet Lists"] },
  { label: "Property Management", icon: "/icons/finance_sidebar_icon.svg", subItems: ["Dashboard"] },
  { label: "MAM", icon: "/icons/finance_sidebar_icon.svg", subItems: ["Transportation"] },
  { label: "Equipment", icon: "/images/Tasks_Nav.svg", subItems: ["Asset Register"] },
];

// open: the module whose sub-menu is shown; lit: the module the voice is talking about
export default function Sidebar({ open, lit }: { open?: string; lit?: string }) {
  return (
    <div className={styles.sidebar} style={{ width: 250, flex: "none" }} data-demo="modules">
      <div className={styles["logo-container"]} style={{ marginLeft: 0, padding: "0 8px 0 16px" }}>
        <img src="/images/TF_logo_Horizontal.svg" alt="TaskForce CON" width={122} height={49} />
        <img src="/images/collapsableArrow.svg" alt="" width={32} height={32} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", flex: 1, minHeight: 0, overflowY: "auto" }}
           data-demo="module-list">
        {MODULES.map((m) => {
          const focused = lit === m.label;
          const subOpen = open === m.label && !!m.subItems;
          return (
            <div key={m.label} className={subOpen ? item["subitem-open"] : ""} data-module={m.label}>
              <div className={`${item.container} ${focused && !m.subItems ? item.bg : ""}`}
                   style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 4px 6px 16px" }}>
                <div className={focused ? item["primary-bg"] : item["image-container"]}
                     style={{ width: 24, height: 24, display: "flex", justifyContent: "center", alignItems: "center", borderRadius: 6 }}>
                  <img src={m.icon} alt="" width={18} height={18}
                       style={focused ? { filter: "brightness(0) invert(1)" } : undefined} />
                </div>
                <div className={`${item.label} ${focused ? item.focusedText : item.normaltext}`}
                     style={{ display: "flex", flex: 1, justifyContent: "space-between", alignItems: "center" }}>
                  <span>{m.label}</span>
                  {m.subItems && (
                    <img src="/icons/Nav_submenuArrow.svg" alt="" width={18} height={18}
                         style={{ transform: subOpen ? "rotate(90deg)" : undefined, transition: "transform 200ms" }} />
                  )}
                </div>
              </div>
              {subOpen && m.subItems!.map((s) => (
                <div key={s} className={item.container}
                     style={{ padding: "6px 4px 6px 52px", color: "#3D424F", fontSize: 14 }}>{s}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
