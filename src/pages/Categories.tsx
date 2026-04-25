import { Navigate, useLocation } from "react-router-dom";

const Categories = () => {
  const location = useLocation();

  return <Navigate to={`/stores${location.search}`} replace />;
};

export default Categories;
