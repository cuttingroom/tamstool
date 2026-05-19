import { useEffect } from "react";
import { TopNavigation } from "@cloudscape-design/components";
import { Mode, applyMode } from "@cloudscape-design/global-styles";
import useStoreManager from "@/stores/useStoreManager";
import usePreferencesStore from "@/stores/usePreferencesStore";
import { useNavigate } from "react-router-dom";
import { version as appVersion } from "../../package.json";
import "./Header.css";

const Header = () => {
  const mode = usePreferencesStore((s) => s.mode);
  const setMode = usePreferencesStore((s) => s.setMode);
  const activeStore = useStoreManager((s) => s.getActiveStore());
  const navigate = useNavigate();

  applyMode(mode);

  // Expose the app version to CSS so Header.css can render it via ::after,
  // keeping it smaller and subdued without changing the TopNavigation API.
  useEffect(() => {
    document.body.style.setProperty("--app-version", `"v${appVersion}"`);
  }, []);

  const handleDropdownClick = ({ detail }) => {
    if (detail.id === "stores") {
      navigate("/stores");
    }
    if (detail.id === "dark") {
      setMode(Mode.Dark);
    }
    if (detail.id === "light") {
      setMode(Mode.Light);
    }
  };

  return (
    <TopNavigation
      identity={{
        href: "#/",
        title: "TAMS Store Browser",
        logo: { src: "/tamstool/cuttingroom-logo.svg" },
      }}
      utilities={[
        ...(activeStore
          ? [
              {
                type: "button",
                text: activeStore.name,
                onClick: () => navigate("/stores"),
              },
            ]
          : []),
        {
          type: "menu-dropdown",
          text: "Settings",
          iconName: "settings",
          onItemClick: handleDropdownClick,
          items: [
            { id: "stores", text: "Manage Stores" },
            { id: "dark", text: "Dark Mode", disabled: mode === Mode.Dark },
            { id: "light", text: "Light Mode", disabled: mode === Mode.Light },
          ],
        },
      ]}
    />
  );
};

export default Header;
