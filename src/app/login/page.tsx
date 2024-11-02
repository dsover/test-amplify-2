"use client";
import React, { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Input, Divider } from "@nextui-org/react";

function LazySearchParams({
    setCallbackUrl,
}: {
    setCallbackUrl: (url: string) => void;
}) {
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

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            handleLogin();
        }
    };

    return (
        <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg">
            <Suspense fallback={<div>Loading...</div>}>
                <LazySearchParams setCallbackUrl={setCallbackUrl} />
            </Suspense>
            <div>
                {newPasswordRequired ? (
                    <>
                        <text>Please set a new password</text>
                        <Divider className="my-4" />
                        <Input
                            placeholder="Password"
                            type="password"
                            onChange={(e) =>
                                setNewPasswordInput(e.currentTarget.value)
                            }
                            value={newPasswordInput}
                            disabled={isLoggingIn}
                            onKeyDown={handleKeyDown}
                        />
                    </>
                ) : initiateForgotPassword ? (
                    <>
                        <text>Enter your username to reset your password</text>
                        <Divider className="my-4" />
                        <Input
                            placeholder="Username"
                            onChange={(e) => setUsername(e.currentTarget.value)}
                            value={username}
                            disabled={isLoggingIn}
                            onKeyDown={handleKeyDown}
                        />
                    </>
                ) : resetCodeRequired ? (
                    <>
                        <text>
                            Enter the reset code sent to your email address and
                            set a new password
                        </text>
                        <Divider className="my-4" />
                        <Input
                            placeholder="Reset Code"
                            type="number"
                            autoComplete="off"
                            inputMode="numeric"
                            onChange={(e) =>
                                setResetCodeInput(e.currentTarget.value)
                            }
                            value={resetCodeInput}
                            disabled={isLoggingIn}
                            onKeyDown={handleKeyDown}
                        />
                        <Input
                            placeholder="New Password"
                            type="password"
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            value={password}
                            disabled={isLoggingIn}
                            onKeyDown={handleKeyDown}
                        />
                    </>
                ) : (
                    <>
                        <text>Sign in with your username and password</text>
                        <Divider className="my-4" />
                        <Input
                            placeholder="Username"
                            onChange={(e) => setUsername(e.currentTarget.value)}
                            value={username}
                            disabled={isLoggingIn}
                            onKeyDown={handleKeyDown}
                        />

                        <Input
                            placeholder="Password"
                            type="password"
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            value={password}
                            disabled={isLoggingIn}
                            onKeyDown={handleKeyDown}
                        />
                    </>
                )}
                {loginError && <text color="red">{loginError}</text>}
                <Divider className="my-4" />
                <Button
                    color="primary"
                    onClick={handleLogin}
                    style={{
                        border: "rgb(0, 0, 0, 0.2) solid 1px",
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault(); // Prevent scrolling on space
                            handleLogin();
                        }
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
                </Button>
                {newPasswordRequired ||
                initiateForgotPassword ||
                resetCodeRequired ? null : (
                    <Button
                        onClick={handleForgotPwdClick}
                        color="secondary"
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault(); // Prevent scrolling on space
                                handleForgotPwdClick();
                            }
                        }}
                    >
                        Forgot Password
                    </Button>
                    // <a onClick={handleForgotPwdClick}>
                    //     Forgot Password
                    // </a>
                )}
            </div>
        </div>
    );
}
