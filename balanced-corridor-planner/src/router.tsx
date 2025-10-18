import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import OverviewPage from "./pages/OverviewPage";
import FeatureTogglesPage from "./pages/FeatureTogglesPage";
import ArchiveViewerPage from "./pages/ArchiveViewerPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "features", element: <FeatureTogglesPage /> },
      { path: "archives", element: <ArchiveViewerPage /> },
    ],
  },
]);

export default router;
