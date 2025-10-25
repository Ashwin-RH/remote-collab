// src/App.jsx
import React, { useState, useEffect } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "react-hot-toast"; // ✅ Import here

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:4000/protected", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 200) setLoading(false);
        else handleLogout();
      } catch {
        handleLogout();
      }
    };
    verifyUser();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  if (loading) return <div className="text-white p-4">Loading...</div>;

  if (!token || !user)
    return (
      <>
        <Toaster position="top-center" reverseOrder={false} /> {/* ✅ Toast UI */}
        <Auth setToken={setToken} setUser={setUser} />
      </>
    );

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} /> {/* ✅ Toast UI */}
      <Dashboard
        user={user}
        token={token}
        setToken={setToken}
        setUser={setUser}
      />
    </>
  );
}
