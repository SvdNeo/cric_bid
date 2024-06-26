import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from './firebase/firebase_config';
import { logInWithEmailAndPassword } from './firebase/auth';
import { useAuthState } from "react-firebase-hooks/auth";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, loading, error] = useAuthState(auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) navigate("/playerManager");
  }, [user, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await logInWithEmailAndPassword(email, password);
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="text"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className='login-button'>
          <button type="submit">Login</button>
        </div>
      </form>
    </div>
  );
};

export default Login;
