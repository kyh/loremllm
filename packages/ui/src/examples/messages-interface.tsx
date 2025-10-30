"use client";

import * as React from "react";

import { ActionButton } from "../action-button";
import { Message } from "../ai-elements/message";
import { Avatar, AvatarFallback } from "../avatar";
import { Divider } from "../divider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Input } from "../input";
import { Navigation } from "../navigation";
import { RowEllipsis } from "../row-ellipsis";
import { SidebarLayout } from "../sidebar-layout";

const ChatPreviewInline = (props: { children: React.ReactNode }) => {
  return <RowEllipsis>{props.children}</RowEllipsis>;
};

const MessagesInterface = () => {
  return (
    <div style={{ minWidth: "28ch" }}>
      <Navigation
        logo="✶"
        left={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton>FILE</ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>⊹ Open</DropdownMenuItem>
                <DropdownMenuItem>⊹ New Message</DropdownMenuItem>
                <DropdownMenuItem>⊹ Quick Look</DropdownMenuItem>
                <DropdownMenuItem>⊹ Close Messages</DropdownMenuItem>
                <DropdownMenuItem>
                  ⊹ Open Conversation in New Window
                </DropdownMenuItem>
                <DropdownMenuItem>⊹ Print...</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton>EDIT</ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>⊹ Undo</DropdownMenuItem>
                <DropdownMenuItem>⊹ Redo</DropdownMenuItem>
                <DropdownMenuItem>⊹ Cut</DropdownMenuItem>
                <DropdownMenuItem>⊹ Copy</DropdownMenuItem>
                <DropdownMenuItem>⊹ Paste</DropdownMenuItem>
                <DropdownMenuItem>⊹ Paste and Match Style</DropdownMenuItem>
                <DropdownMenuItem>⊹ Delete</DropdownMenuItem>
                <DropdownMenuItem>⊹ Select All</DropdownMenuItem>
                <DropdownMenuItem>⊹ Find...</DropdownMenuItem>
                <DropdownMenuItem>⊹ Find Next</DropdownMenuItem>
                <DropdownMenuItem>⊹ Find Previous</DropdownMenuItem>
                <DropdownMenuItem>⊹ Spelling and Grammar</DropdownMenuItem>
                <DropdownMenuItem>⊹ Substitutions</DropdownMenuItem>
                <DropdownMenuItem>⊹ Speech</DropdownMenuItem>
                <DropdownMenuItem>⊹ Send Message</DropdownMenuItem>
                <DropdownMenuItem>⊹ Reply to Last Message</DropdownMenuItem>
                <DropdownMenuItem>⊹ Tapback Last Message</DropdownMenuItem>
                <DropdownMenuItem>⊹ Edit Last Message</DropdownMenuItem>
                <DropdownMenuItem>⊹ Autofill</DropdownMenuItem>
                <DropdownMenuItem>⊹ Start Dictation</DropdownMenuItem>
                <DropdownMenuItem>⊹ Emoji & Symbols</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton>VIEW</ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>⊹ Show Tab Bar</DropdownMenuItem>
                <DropdownMenuItem>⊹ Show All Tabs</DropdownMenuItem>
                <DropdownMenuItem>⊹ Make Text Bigger</DropdownMenuItem>
                <DropdownMenuItem>⊹ Make Text Normal Size</DropdownMenuItem>
                <DropdownMenuItem>⊹ Make Text Smaller</DropdownMenuItem>
                <DropdownMenuItem>⊹ All Messages</DropdownMenuItem>
                <DropdownMenuItem>⊹ Known Senders</DropdownMenuItem>
                <DropdownMenuItem>⊹ Unknown Senders</DropdownMenuItem>
                <DropdownMenuItem>⊹ Unread Messages</DropdownMenuItem>
                <DropdownMenuItem>⊹ Recently Delete</DropdownMenuItem>
                <DropdownMenuItem>⊹ Show Sidebar</DropdownMenuItem>
                <DropdownMenuItem>⊹ Enter Full Screen</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        right={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton>HELP</ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>⊹ Search</DropdownMenuItem>
                <DropdownMenuItem>⊹ Messages Help</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      ></Navigation>
      <Divider type="double" />
      <SidebarLayout
        defaultSidebarWidth={12}
        isShowingHandle={true}
        sidebar={
          <>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <ChatPreviewInline>
                No, it has to be more unique
              </ChatPreviewInline>
            </div>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <ChatPreviewInline>
                No, it has to be more unique
              </ChatPreviewInline>
            </div>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <ChatPreviewInline>
                No, it has to be more unique
              </ChatPreviewInline>
            </div>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <ChatPreviewInline>
                No, it has to be more unique
              </ChatPreviewInline>
            </div>
          </>
        }
      >
        <Message from="user">Why are they all looking at me?</Message>
        <Message from="assistant">
          Because my subconscious feels that someone else is creating this
          world. The more you change things, the quicker the projections start
          to converge on you.
        </Message>
        <Message from="user">Converge?</Message>
        <Message from="assistant">
          It's the foreign nature of the dreamer. They attack like white blood
          cells fighting an infection.
        </Message>
        <Message from="user">They're going to attack us?</Message>
        <Message from="assistant">No. Just you.</Message>
        <br />
        <br />
        <Input autoComplete="off" name="test_message_interface" />
      </SidebarLayout>
    </div>
  );
};

export { MessagesInterface };
