import {
  AppLayout,
  BreadcrumbGroup,
  ContentLayout,
  Flashbar,
  SideNavigation,
} from "@cloudscape-design/components";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Header from "@/components/Header";
import { useState } from "react";
import useAlertsStore from "@/stores/useAlertsStore";
import useStoreManager from "@/stores/useStoreManager";

const Layout = () => {
  const [navigationOpen, setNavigationOpen] = useState(true);
  const alertItems = useAlertsStore((state) => state.alertItems);
  const activeStoreId = useStoreManager((s) => s.activeStoreId);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const followLink = (e) => {
    e.preventDefault();
    navigate(e.detail.href);
  };

  const breadCrumbs = () => {
    let breadCrumbPath = pathname;
    if (
      breadCrumbPath.startsWith("/player") ||
      breadCrumbPath.startsWith("/diagram")
    ) {
      const splitPath = pathname.split("/").filter((p) => p !== "");
      splitPath.push(splitPath.splice(0, 1)[0]);
      breadCrumbPath = "/" + splitPath.join("/");
    }
    const hrefs = breadCrumbPath
      .split("/")
      .slice(1)
      .reduce(
        (allPaths, subPath) => {
          const lastPath = allPaths[allPaths.length - 1];
          allPaths.push(
            lastPath.endsWith("/")
              ? lastPath + subPath
              : `${lastPath}/${subPath}`
          );
          return allPaths;
        },
        ["/"]
      );
    return hrefs.map((href) => ({
      text: href === "/" ? "home" : href.split("/").at(-1),
      href,
    }));
  };

  const activeStore = useStoreManager((s) => s.getActiveStore());

  const navHeader = {
    text: activeStore ? activeStore.name : "No store selected",
    href: "/stores",
  };

  const navItems = [
    { type: "link", text: "Sources", href: "/sources", disabled: !activeStore },
    { type: "link", text: "Flows", href: "/flows", disabled: !activeStore },
    { type: "divider" },
    { type: "link", text: "Manage Stores", href: "/stores" },
  ];

  return (
    <>
      <Header />
      <AppLayout
        notifications={<Flashbar items={alertItems} stackItems />}
        breadcrumbs={
          <BreadcrumbGroup onFollow={followLink} items={breadCrumbs()} />
        }
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        navigation={
          <SideNavigation header={navHeader} onFollow={followLink} items={navItems} />
        }
        toolsHide
        content={
          <ContentLayout disableOverlap>
            <div key={activeStoreId}>
              <Outlet />
            </div>
          </ContentLayout>
        }
      />
    </>
  );
};

export default Layout;
