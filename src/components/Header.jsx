import { useState } from "react";
import { TopNavigation } from "@cloudscape-design/components";
import { Mode, applyMode } from "@cloudscape-design/global-styles";
import useStoreManager from "@/stores/useStoreManager";
import { useNavigate } from "react-router-dom";
import "./Header.css";

const Header = () => {
  const [mode, setMode] = useState(Mode.Dark);
  const activeStore = useStoreManager((s) => s.getActiveStore());
  const navigate = useNavigate();

  applyMode(mode);

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
