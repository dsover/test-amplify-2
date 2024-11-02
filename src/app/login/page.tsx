"use client";
import React, { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";


function LazySearchParams({ setCallbackUrl }: { setCallbackUrl: (url: string) => void }) {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams) {
            const url = searchParams.get("callbackUrl");
            setCallbackUrl(url || "/");
        }
    }, [searchParams, setCallbackUrl]);

    return null;
}

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [callbackUrl, setCallbackUrl] = useState("/");

    const [newPasswordRequired, setNewPasswordRequired] = useState(false);
    const [newPasswordInput, setNewPasswordInput] = useState("");
    const [newPasswordSession, setNewPasswordSession] = useState("");

    const [initiateForgotPassword, setInitiateForgotPassword] = useState(false);
    const [resetCodeRequired, setResetCodeRequired] = useState(false);
    const [resetCodeInput, setResetCodeInput] = useState("");

    const router = useRouter();
    
    const login = async (u: string, p: string) => {
        console.log("login", u, p);
        if (!u || !p) {
            setLoginError("Username and password are required.");
            return false;
        }

        const response = await signIn("credentials", {
            username: u.toLowerCase(),
            password: p,
            callbackUrl: callbackUrl,
            redirect: false,
        });

        console.log("response", response);

        if (response?.ok) {
            router.push(response?.url || "/");
            return true;
        } else if (response?.error) {
            const error = JSON.parse(response.error);
            if (error.code === "NEW_PASSWORD_REQUIRED") {
                setPassword("");
                setNewPasswordSession(error.session);
                setNewPasswordRequired(true);
            } else {
                setLoginError("Login failed. Please try again.");
            }
        }
        return false;
    };

    const handleResetPassword = async () => {
        setIsLoggingIn(true);

        const resetParams = {
            method: "set_password",
            username: username.toLowerCase(),
            password: newPasswordInput,
            session: newPasswordSession,
        };

        const resetResponse = await fetch("/api/auth/cognito", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(resetParams),
        });

        console.log("resetResponse", resetResponse);
        if (resetResponse.ok) {
            setNewPasswordRequired(false);
            setPassword(newPasswordInput);

            const loginSuccess = await login(username, newPasswordInput);

            if (loginSuccess) {
                return;
            }
        } else {
            const error = await resetResponse.json();
            setLoginError(error.message);
        }
        setIsLoggingIn(false);
    };

    const handleForgotPassword = async () => {
        setIsLoggingIn(true);

        const resetParams = {
            method: "forgot_password",
            username: username.toLowerCase(),
        };

        const resetResponse = await fetch("/api/auth/cognito", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(resetParams),
        });

        console.log("resetResponse", resetResponse);
        if (resetResponse.ok) {
            setInitiateForgotPassword(false);
            setResetCodeRequired(true);
            setPassword("");
            setLoginError("Password reset code sent to your email address.");
        } else {
            const error = await resetResponse.json();
            setLoginError(error.message);
        }
        setIsLoggingIn(false);
    };

    const handleVerifyResetCode = async () => {
        setIsLoggingIn(true);

        const resetParams = {
            method: "verify_reset_code",
            username: username.toLowerCase(),
            code: resetCodeInput,
            new_password: password,
        };

        const resetResponse = await fetch("/api/auth/cognito", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(resetParams),
        });

        console.log("resetResponse", resetResponse);
        if (resetResponse.ok) {
            setResetCodeRequired(false);
            setPassword("");
            setLoginError("");

            const loginSuccess = await login(username, password);

            if (loginSuccess) {
                return;
            }
        } else {
            const error = await resetResponse.json();
            setLoginError(error.message);
        }
        setIsLoggingIn(false);
    };

    const handleLogin = async () => {
        if (!username) {
            setLoginError("Username and password are required.");
            return;
        }
        setLoginError("");

        if (newPasswordRequired) {
            handleResetPassword();
            return;
        }
        if (initiateForgotPassword) {
            handleForgotPassword();
            return;
        }
        if (resetCodeRequired) {
            handleVerifyResetCode();
            return;
        }
        setIsLoggingIn(true);

        const loginSuccess = await login(username, password);

        if (!loginSuccess) {
            setIsLoggingIn(false);
        }
    };

    const handleForgotPwdClick = () => {
        setLoginError("");
        setInitiateForgotPassword(true);
    };

    return (
        <div>
              <Suspense fallback={<div>Loading...</div>}>
                <LazySearchParams setCallbackUrl={setCallbackUrl} />
            </Suspense>

            <div>
                <div>
                    <div>
                        <div>
                            {newPasswordRequired ? (
                                <>
                                    <text>Please set a new password</text>

                                    <input
                                        placeholder="Password"
                                        type="password"
                                        onChange={(e) =>
                                            setNewPasswordInput(
                                                e.currentTarget.value
                                            )
                                        }
                                        value={newPasswordInput}
                                        disabled={isLoggingIn}
                                    />
                                </>
                            ) : initiateForgotPassword ? (
                                <>
                                    <text>
                                        Enter your username to reset your
                                        password
                                    </text>

                                    <input
                                        placeholder="Username"
                                        onChange={(e) =>
                                            setUsername(e.currentTarget.value)
                                        }
                                        value={username}
                                        disabled={isLoggingIn}
                                    />
                                </>
                            ) : resetCodeRequired ? (
                                <>
                                    <text>
                                        Enter the reset code sent to your email
                                        address and set a new password
                                    </text>

                                    <input
                                        placeholder="Reset Code"
                                        type="number"
                                        autoComplete="off"
                                        inputMode="numeric"
                                        onChange={(e) =>
                                            setResetCodeInput(
                                                e.currentTarget.value
                                            )
                                        }
                                        value={resetCodeInput}
                                        disabled={isLoggingIn}
                                    />
                                    <input
                                        placeholder="New Password"
                                        type="password"
                                        onChange={(e) =>
                                            setPassword(e.currentTarget.value)
                                        }
                                        value={password}
                                        disabled={isLoggingIn}
                                    />
                                </>
                            ) : (
                                <>
                                    <text>
                                        Sign in with your username and password
                                    </text>

                                    <input
                                        placeholder="Username"
                                        onChange={(e) =>
                                            setUsername(e.currentTarget.value)
                                        }
                                        value={username}
                                        disabled={isLoggingIn}
                                    />
                                    <input
                                        placeholder="Password"
                                        type="password"
                                        onChange={(e) =>
                                            setPassword(e.currentTarget.value)
                                        }
                                        value={password}
                                        disabled={isLoggingIn}
                                    />
                                </>
                            )}
                            {loginError && (
                                <text color="red">{loginError}</text>
                            )}

                            <button
                                color="var(--oap-teal)"
                                onClick={handleLogin}
                                style={{
                                    border: "rgb(0, 0, 0, 0.2) solid 1px",
                                }}
                            >
                                <text>
                                    {isLoggingIn
                                        ? ``
                                        : newPasswordRequired
                                        ? `Set Password`
                                        : initiateForgotPassword
                                        ? `Send Reset Code`
                                        : resetCodeRequired
                                        ? `Confirm`
                                        : `Login`}
                                </text>
                            </button>
                            {newPasswordRequired ||
                            initiateForgotPassword ||
                            resetCodeRequired ? null : (
                                <a onClick={handleForgotPwdClick}>
                                    Forgot Password
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <text>
                    Having trouble logging in or need to request a new login?
                </text>
                <text>Contact OpenAP at product_support@openap.tv</text>
            </div>
        </div>
    );
}
