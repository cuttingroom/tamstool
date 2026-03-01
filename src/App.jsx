import { HashRouter, Route, Routes } from "react-router-dom";

import Diagram from "@/views/Diagram";
import Flow from "@/views/Flow";
import Flows from "@/views/Flows";
import { OmakaseHlsPlayer } from "@/views/OmakasePlayer";
import Home from "@/views/Home";
import Layout from "@/views/Layout";
import React from "react";
import Source from "@/views/Source";
import Sources from "@/views/Sources";
import StoreManager from "@/views/StoreManager";

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="stores" element={<StoreManager />} />
          <Route path="sources">
            <Route index element={<Sources />} />
            <Route path=":sourceId" element={<Source />} />
          </Route>
          <Route path="flows">
            <Route index element={<Flows />} />
            <Route path=":flowId" element={<Flow />} />
          </Route>
          <Route path="diagram/:type/:id" element={<Diagram />} />
          <Route path="player/:type/:id" element={<OmakaseHlsPlayer />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
