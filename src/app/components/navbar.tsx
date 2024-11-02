"use client";
import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    Link,
    DropdownItem,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
    Avatar,
} from "@nextui-org/react";
import { useSession, signOut } from "next-auth/react";

import { Logo } from "./logo";
export default function Nav() {
    const { data: session } = useSession();
    const isLoggedIn = !!session;

    return (
        <Navbar isBordered maxWidth="full">
            <NavbarBrand className="flex items-center">
                <Logo />
                <p className="font-bold text-inherit ml-2">my-app</p>
            </NavbarBrand>

            <NavbarContent className="hidden sm:flex gap-4 justify-center flex-grow">
                <NavbarItem>
                    <Link color="foreground" href="#">
                        home
                    </Link>
                </NavbarItem>
            </NavbarContent>

            {isLoggedIn ? (
                <NavbarContent className="flex justify-end items-center">
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                            <Avatar
                                isBordered
                                as="button"
                                className="transition-transform"
                                color="secondary"
                                name={session.user?.name || "User"}
                                size="sm"
                                src={session.user?.image || "/image/default-avatar.png"}
                            />
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Profile Actions" variant="flat">
                            <DropdownItem key="profile" className="h-14 gap-2" textValue="signed_in_as">
                                <p className="font-semibold">Signed in as</p>
                                <p className="font-semibold">{session.user?.email}</p>
                            </DropdownItem>
                            <DropdownItem key="settings" textValue="my_settings">My Settings</DropdownItem>
                            <DropdownItem key="team_settings" textValue="team_settings">Team Settings</DropdownItem>
                            <DropdownItem key="analytics" textValue="analytics">Analytics</DropdownItem>
                            <DropdownItem key="system" textValue="system">System</DropdownItem>
                            <DropdownItem key="configurations" textValue="configurations">Configurations</DropdownItem>
                            <DropdownItem key="help_and_feedback" textValue="help_and_feedback">Help & Feedback</DropdownItem>
                            <DropdownItem
                                key="logout"
                                textValue="logout"
                                color="danger"
                                onClick={() => signOut({ callbackUrl: process.env.NEXTAUTH_URL })}
                            >
                                Log Out
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </NavbarContent>
            ) : (
                <NavbarContent className="flex justify-end items-center">
                    <NavbarItem>
                        <Link color="foreground" href="/login">
                            Login
                        </Link>
                    </NavbarItem>
                </NavbarContent>
            )}
        </Navbar>
    );
}