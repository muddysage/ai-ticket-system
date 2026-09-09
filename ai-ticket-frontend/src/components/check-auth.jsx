// Redirects users based on whether a JWT exists in browser local storage.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CheckAuth({ children, protectedRoute }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The token is the frontend's simple indication that the user is logged in.
    const token = localStorage.getItem("token");

    if (protectedRoute === true) {
      if (!token) {
        navigate("/login");
      } else {
        setLoading(false);
      }
    } else {
      if (token) {
        navigate("/");
      } else {
        setLoading(false);
      }
    }
  }, [navigate, protectedRoute]);

  if (loading) {
    return <div>loading...</div>;
  }
  return children;
}

export default CheckAuth;
