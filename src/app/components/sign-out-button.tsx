"use client";
import {Button} from "@nextui-org/button";

import { signOut } from "next-auth/react";

const SignOutButton = () => {
  return (
    <Button onClick={() => signOut()}>sign out</Button>
  );
};

export default SignOutButton;