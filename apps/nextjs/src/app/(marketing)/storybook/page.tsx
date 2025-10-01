import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/accordion";
import { ActionBar } from "@repo/ui/action-bar";
import { ActionButton } from "@repo/ui/action-button";
import { ActionListItem } from "@repo/ui/action-list-item";
import { Message } from "@repo/ui/ai-elements/message";
import { AlertBanner } from "@repo/ui/alert-banner";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Badge } from "@repo/ui/badge";
import { BarLoader } from "@repo/ui/bar-loader";
import { BarProgress } from "@repo/ui/bar-progress";
import { Block } from "@repo/ui/block";
import { BlockLoader } from "@repo/ui/block-loader";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui/breadcrumb";
import { Button } from "@repo/ui/button";
import { ButtonGroup } from "@repo/ui/button-group";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { CardDouble } from "@repo/ui/card-double";
import { Checkbox } from "@repo/ui/checkbox";
import { Chessboard } from "@repo/ui/chessboard";
import { CodeBlock } from "@repo/ui/code-block";
import { ComboBox } from "@repo/ui/combobox";
import { DataTable } from "@repo/ui/data-table";
import { DatePicker } from "@repo/ui/date-picker";
import { DebugGrid } from "@repo/ui/debug-grid";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Divider } from "@repo/ui/divider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { AS400 } from "@repo/ui/examples/as400";
import { DefaultActionBar } from "@repo/ui/examples/default-action-bar";
import { MessagesInterface } from "@repo/ui/examples/messages-interface";
import { Grid } from "@repo/ui/grid";
import { Indent } from "@repo/ui/indent";
import { Input } from "@repo/ui/input";
import { ListItem } from "@repo/ui/list-item";
import { NumberRangeSlider } from "@repo/ui/number-range-slider";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { RadioGroup, RadioGroupItem } from "@repo/ui/radio-group";
import { Row } from "@repo/ui/row";
import { RowSpaceBetween } from "@repo/ui/row-space-between";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { Textarea } from "@repo/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip";
import { TreeView } from "@repo/ui/tree-view";

const Page = () => {
  return (
    <div className="min-h-screen max-w-[80ch]">
      <DebugGrid />
      <DefaultActionBar />

      <Grid>
        <Accordion
          type="multiple"
          defaultValue={[
            "action-bar",
            "accordion",
            "action-buttons",
            "action-list",
            "alert-banner",
            "as400-example",
            "avatars",
            "badges",
            "bar-loader",
            "blog-post",
            "block-loader",
            "breadcrumbs",
            "buttons",
            "button-group",
            "cards",
            "code-blocks",
            "combobox",
            "data-table",
            "dashboard-radar",
            "date-picker",
            "denabase",
            "chessboard",
            "checkbox",
            "dialog",
            "divider",
            "drawer",
            "dropdown-menu",
            "empty-state",
            "input",
            "form",
            "link",
            "list",
            "messages",
            "messages-interface",
            "modal",
            "navigation-bar",
            "popover",
            "progress-bars",
            "radio",
            "select",
            "table",
            "sidebar-layout",
            "slider",
            "textarea",
            "tooltip",
            "treeview",
          ]}
        >
          <AccordionItem value="action-bar">
            <AccordionTrigger>ACTION BAR</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              The action bar is a container for primary and secondary actions
              styled with a monospace font. Positioned at the top or bottom of
              an interface, it organizes elements like menu options, navigation
              buttons, titles, or search fields.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActionBar>
                    <ActionButton hotkey="⌘+1">Example I</ActionButton>
                    <ActionButton hotkey="⌘+2">Example II</ActionButton>
                    <ActionButton hotkey="⌘+3">Example III</ActionButton>
                  </ActionBar>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="accordion">
            <AccordionTrigger>ACCORDION</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Accordion components are vertically stacked, expandable panels
              designed for efficient use of space in monospace-driven layouts,
              often inspired by classic terminal interfaces. Each panel consists
              of a header and its corresponding content area, allowing users to
              toggle between a condensed summary and detailed information.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="nested">
                      <AccordionTrigger>ACCORDION EXAMPLE</AccordionTrigger>
                      <AccordionContent className="whitespace-pre-wrap">
                        There are two visions of America a half century from
                        now. One is of a society more divided between the haves
                        and the have-nots, a country in which the rich live in
                        gated communities, send their children to expensive
                        schools, and have access to first-rate medical care.
                        Meanwhile, the rest live in a world marked by
                        insecurity, at best mediocre education, and in effect
                        rationed health care―they hope and pray they don't get
                        seriously sick. At the bottom are millions of young
                        people alienated and without hope. I have seen that
                        picture in many developing countries; economists have
                        given it a name, a dual economy, two societies living
                        side by side, but hardly knowing each other, hardly
                        imagining what life is like for the other. Whether we
                        will fall to the depths of some countries, where the
                        gates grow higher and the societies split farther and
                        farther apart, I do not know. It is, however, the
                        nightmare towards which we are slowly marching.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="action-buttons">
            <AccordionTrigger>ACTION BUTTONS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Action buttons let users perform actions. They are used for
              task-based options within a workflow and work well in interfaces
              where buttons need to stay understated.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActionButton hotkey="⌘+S">Save</ActionButton>
                  <br />
                  <ActionButton hotkey={<BlockLoader mode={9} />}>
                    Loading
                  </ActionButton>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="action-list">
            <AccordionTrigger>ACTION LIST</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Action lists are a vertical list of interactive actions or
              options. It displays items in a single-column format with space
              for icons, descriptions, side information, and other visuals. The
              monospace font ensures clarity and consistency.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActionListItem icon={`⭡`}>Hide item example</ActionListItem>
                  <ActionListItem icon={`⭢`}>Next item example</ActionListItem>
                  <ActionListItem icon={`⭣`}>Show item example</ActionListItem>
                  <ActionListItem icon={`⭠`} href="/">
                    Return item example
                  </ActionListItem>
                  <ActionListItem icon={`⊹`}>
                    Action item example
                  </ActionListItem>
                  <ActionListItem
                    icon={`⊹`}
                    href="https://internet.dev"
                    target="_blank"
                  >
                    Visit the studio website
                  </ActionListItem>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="alert-banner">
            <AccordionTrigger>ALERT BANNER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Alert banners display important messages across the user
              interface. It communicates system-wide issues, errors, warnings,
              or informational updates. Typically placed at the top of a page,
              it includes a clear message and may provide an action for the
              user. Alert Banners can be dismissed after being read, helping
              users stay informed about significant changes or information.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <AlertBanner>
                    When things reach the extreme, they alternate to the
                    opposite.
                  </AlertBanner>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="as400-example">
            <AccordionTrigger>APPLICATION SYSTEM/400 EXAMPLE</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              The Application System 400 (AS/400) is a line of servers and
              network adapters from IBM that was designed to help businesses
              manage their data, applications, and systems infrastructure. This
              usage example is a tribute to the interfaces those servers had.
              <br />
              <br />
              <AS400 />
              <br />
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="avatars">
            <AccordionTrigger>AVATARS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Avatars identify users or entities in the interface. It can
              display an image, initials, or an icon, offering a visual
              connection to the user. Avatars appear in headers, comments,
              profiles, and messages. They provide quick recognition and add a
              personal touch to the digital experience.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                  >
                    <Avatar>
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>AB</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                  </div>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="badges">
            <AccordionTrigger>BADGES</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Badges communicate status, notification counts, or attribute
              labels. Typically circular or pill-shaped, they display a number
              or short text, often overlaid on an icon or element. Badges
              highlight updates, unread messages, or categorize items with
              status indicators. They provide critical information at a glance,
              improving navigation and user engagement.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge>Example</Badge>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bar-loader">
            <AccordionTrigger>BAR LOADER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              A long loader is a visual element that signals ongoing activity or
              progress, reassuring users that a task is being processed.
              Commonly used during actions like data fetching or file uploads,
              it provides feedback to reduce uncertainty.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarLoader intervalRate={1000} />
                  <BarLoader intervalRate={100} />
                  <BarLoader progress={50} />
                  <BarLoader progress={100} />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="blog-post">
            <AccordionTrigger>BLOG POST</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              A blog post can be composed of various components from our
              component repository. Typically, blog posts include breadcrumbs,
              an avatar, the author's name, the publication date, and the blog
              post content.
              <br />
              <br />
              <CardDouble title="POST">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="https://www.youtube.com/watch?v=98LdFA-_zfA">
                        Christopher Alexander
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="http://www.natureoforder.com/overview.htm">
                        The Nature of Order
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        Book 1: The Phenomenon of Life
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <br />
                <br />
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "flex-start",
                  }}
                >
                  <Avatar>
                    <AvatarFallback>CA</AvatarFallback>
                  </Avatar>
                  <Indent>
                    CHRISTOPHER ALEXANDER
                    <br />
                    1-1-2002
                  </Indent>
                </div>
                <br />
                <Divider type="double" />
                <br />
                <br />
                I believe that we have in us a residue of a world-picture which
                is essentially mechanical in nature – what we might call the
                mechanist-rationalist world picture ... Like an infection it has
                entered us, it affects our actions, it affects our morals, it
                affects our sense of beauty.
                <br />
                <br />
                This is a picture of a world made of atoms which whirl around in
                a mechanical fashion: a world in which it is assumed that all
                the universe is a blind mechanism, whirling on its way, under
                the impact of the 'laws of nature.'
                <br />
                <br />
                When we understand what order is, I believe we shall better
                understand what matter is and then what the universe itself is.
              </CardDouble>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="block-loader">
            <AccordionTrigger>BLOCK LOADER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              A block loader is a visual indicator that signals ongoing activity
              or progress while occupying only a single character of space. It
              reassures users that a task is being processed or that activity is
              occurring.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <BlockLoader mode={0} />
                  <br />
                  <BlockLoader mode={1} />
                  <br />
                  <BlockLoader mode={2} />
                  <br />
                  <BlockLoader mode={3} />
                  <br />
                  <BlockLoader mode={9} />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="breadcrumbs">
            <AccordionTrigger>BREADCRUMBS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Breadcrumbs display the current page or context within a website
              or application. They show the hierarchy and navigation path,
              helping users understand their location. Breadcrumbs allow users
              to navigate back through levels or categories and are especially
              useful for deeply nested pages.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/components">
                          Components
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Combined</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="buttons">
            <AccordionTrigger>BUTTONS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Button components are essential interactive elements within SRCL,
              facilitating actions like navigation, form submission, and command
              execution.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button>Primary Button</Button>
                  <br />
                  <Button variant="secondary">Secondary Button</Button>
                  <br />
                  <Button disabled>Disabled Button</Button>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="button-group">
            <AccordionTrigger>BUTTON GROUP</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Button groups organize related actions within a shared container,
              offering quick access to frequently used tasks. These buttons are
              visually connected to emphasize their relationship and can also
              indicate a selected state.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <ButtonGroup>
                    <ActionButton isSelected>16 PX</ActionButton>
                    <ActionButton>32 PX</ActionButton>
                    <ActionButton>42 PX</ActionButton>
                  </ButtonGroup>
                  <ButtonGroup isFull>
                    <ActionButton isSelected>16 PX</ActionButton>
                    <ActionButton>32 PX</ActionButton>
                    <ActionButton>42 PX</ActionButton>
                  </ButtonGroup>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cards">
            <AccordionTrigger>CARDS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Cards are MS-DOS–inspired sections designed to group related
              content and actions. They can serve as standalone features or
              function as part of a larger application. Each card clearly
              outlines key information, making it easier for users to identify
              and interact with important details.
              <br />
              <br />
              <Card>
                <CardHeader mode="left">
                  <CardTitle>Left-A</CardTitle>
                </CardHeader>
                <CardContent>
                  <Card>
                    <CardHeader mode="right">
                      <CardTitle>Right-B</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Card>
                        <CardHeader>
                          <CardTitle>C</CardTitle>
                        </CardHeader>
                        <CardContent>
                          Cards use shadcn's composition pattern with
                          CardHeader, CardTitle, CardContent, and CardFooter
                          subcomponents, all styled with sacred's distinctive
                          border patterns.
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
              <br />
              <CardDouble title="Left-A" mode="left">
                <CardDouble title="Right-B" mode="right">
                  <CardDouble title="C">
                    The CardDouble variant uses double-line borders for enhanced
                    visual hierarchy and separation, maintaining the terminal
                    aesthetic.
                  </CardDouble>
                </CardDouble>
              </CardDouble>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="code-blocks">
            <AccordionTrigger>CODE BLOCKS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Code blocks display code examples with syntax highlighting
              (requires CodeBlock component from sacred).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>CODE</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-family-mono)",
                    }}
                  >
                    {`#include <iostream>
#include <string>

int main() {
    std::cout << "Hello, World!\\n";
    return 0;
}`}
                  </pre>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="combobox">
            <AccordionTrigger>COMBOBOX</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Comboboxes combine a list with an editable textbox, allowing users
              to select from a list or input data manually. It offers
              flexibility and autocomplete features, improving usability in
              scenarios where users may not know all options.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>COMBOBOX</CardTitle>
                </CardHeader>
                <CardContent>
                  <ComboBox data={LANDSCAPES} label="SEARCH THE WORLD" />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="data-table">
            <AccordionTrigger>DATA TABLE</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Data tables are for organizing large datasets into rows and
              columns for clear visibility and easy interpretation. It is used
              in scenarios like reporting systems, dashboards, and list views
              where data needs comparison, analysis, or manipulation. Features
              like sorting, filtering, pagination, and inline editing make data
              handling more efficient. The entire table width is limited to 64ch
              to fit the grid precisely.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>STATIC</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable data={SAMPLE_TABLE_DATA} />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dashboard-radar">
            <AccordionTrigger>DASHBOARD RADAR EXAMPLE</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Tribute to Brian Wyvill's Nostromo interface from Alien 1979
              (requires DashboardRadar from sacred examples).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    DashboardRadar component - orbital simulations visualization
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="date-picker">
            <AccordionTrigger>DATE PICKER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              A date picker is a UI control for selecting dates, and sometimes
              time, through a visual calendar interface inspired by MS-DOS. It
              ensures accurate date input and avoids formatting errors. Commonly
              used in forms, scheduling, or date-related tasks.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <DatePicker year={2012} month={12} />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="denabase">
            <AccordionTrigger>DENABASE EXAMPLE</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Tribute to Territory Studio's work in Blade Runner 2049 (requires
              Denabase from sacred examples).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Denabase component - DNA database card system visualization
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="chessboard">
            <AccordionTrigger>CHESSBOARD</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Minimal 8×8 chessboard component with Unicode pieces (requires
              Chessboard component from sacred).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>DEFAULT</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Chessboard component - maps piece codes to Unicode symbols
                    with labeled rows/columns
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="checkbox">
            <AccordionTrigger>CHECKBOX</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Checkboxes using Radix UI primitives with sacred's ╳ indicator
              character.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <Checkbox id="check1" />
                    <label htmlFor="check1">Option one</label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <Checkbox id="check2" />
                    <label htmlFor="check2">Option two</label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox id="check3" defaultChecked />
                    <label htmlFor="check3">Option three (checked)</label>
                  </div>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dialog">
            <AccordionTrigger>DIALOG</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Dialogs overlay main content using Radix UI Dialog with sacred
              styling.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>CONFIRMATION</DialogTitle>
                      </DialogHeader>
                      <br />
                      <DialogDescription>
                        This dialog uses Radix UI's Dialog primitive for
                        accessibility and keyboard navigation, styled with
                        sacred's terminal aesthetic including the distinctive
                        shadow effect.
                      </DialogDescription>
                      <br />
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="secondary">OK</Button>
                        </DialogClose>
                        <Block style={{ opacity: 0 }} />
                        <DialogClose asChild>
                          <Button variant="secondary">Cancel</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="divider">
            <AccordionTrigger>DIVIDER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Dividers separate content sections with various styles using CVA
              variants.
              <br />
              <br />
              <CardDouble title="ENTROPY">
                Any sense of order or stability inevitably crumbles. The entire
                universe follows a dismal trek toward a dull state of ultimate
                turmoil.
                <br />
                <br />
                <Divider />
                <br />
                To keep track of this cosmic decay, physicists employ a concept
                called entropy. Entropy is a measure of disorderliness, and the
                declaration that entropy is always on the rise — known as the
                second law of thermodynamics — is among nature's most
                inescapable commandments.
                <br />
                <br />
                <Divider type="double" />
                <br />
                I have long felt haunted by the universal tendency toward
                messiness. Order is fragile. It takes months of careful planning
                and artistry to craft a vase but an instant to demolish it with
                a soccer ball.
                <br />
                <br />
                <Divider type="gradient" />
                <br />
                The second law demands that machines can never be perfectly
                efficient, which implies that whenever structure arises in the
                universe, it ultimately serves only to dissipate energy further.
              </CardDouble>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="drawer">
            <AccordionTrigger>DRAWER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              A drawer is a panel that slides in from the screen edge using
              Radix UI Drawer (vaul) with sacred styling.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Drawer component available - implement with DrawerTrigger,
                    DrawerContent pattern
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dropdown-menu">
            <AccordionTrigger>DROPDOWN MENU</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Dropdown menus using Radix UI DropdownMenu with sacred styling.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <RowSpaceBetween>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <ActionButton>TOP LEFT</ActionButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Option 1</DropdownMenuItem>
                        <DropdownMenuItem>Option 2</DropdownMenuItem>
                        <DropdownMenuItem>Option 3</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <ActionButton>TOP RIGHT</ActionButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Menu</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Item A</DropdownMenuItem>
                        <DropdownMenuItem>Item B</DropdownMenuItem>
                        <DropdownMenuItem>Item C</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </RowSpaceBetween>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="empty-state">
            <AccordionTrigger>EMPTY STATE</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              An empty state informs users when no content is available.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Grid>WORK IN PROGRESS</Grid>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="input">
            <AccordionTrigger>INPUT</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Input fields styled with sacred's distinctive border treatment.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input placeholder="Enter text here..." />
                  <br />
                  <Input type="password" placeholder="Password" />
                  <br />
                  <Input placeholder="All the world is a stage" />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="form">
            <AccordionTrigger>FORM</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              A form is a key interface element for collecting user inputs.
              <br />
              <br />
              <CardDouble title="NEW ACCOUNT">
                Create a new MakeBelieve™ account, where anything is possible
                at your command line in the browser.
                <br />
                <br />
                <RadioGroup defaultValue="test_individual">
                  <RadioGroupItem value="test_individual">
                    I'm using this for personal use.
                  </RadioGroupItem>
                  <RadioGroupItem value="test_developer">
                    I'm building or creating something for work.
                  </RadioGroupItem>
                  <RadioGroupItem value="test_company">
                    We're using this as a team or organization.
                  </RadioGroupItem>
                </RadioGroup>
                <br />
                <div style={{ marginBottom: "0.5rem" }}>
                  <Input placeholder="Choose a username (e.g., SurfGirl29)" />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <Input
                    placeholder="Create a password (8+ characters)"
                    type="password"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <Input placeholder="Type it again" type="password" />
                </div>
                <br />
                <div style={{ marginBottom: "0.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <Checkbox id="test_terms" />
                    <label htmlFor="test_terms">
                      I agree to the Terms of Service, Data Privacy Policy, and
                      Acceptable Use Guidelines.
                    </label>
                  </div>
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <Checkbox id="test_goodwill" />
                    <label htmlFor="test_goodwill">
                      I agree not to use this service for unlawful purposes.
                    </label>
                  </div>
                </div>
                <br />
                <Button>Create an account</Button>
              </CardDouble>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="link">
            <AccordionTrigger>LINK</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Links are interactive elements that enable navigation within an
              application or to external resources.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol>
                    <ListItem>
                      <a
                        href="https://www.tumblr.com/tagged/hiroo%20isono"
                        target="_blank"
                      >
                        Hirō Isono
                      </a>
                    </ListItem>
                    <ListItem>
                      <a
                        href="https://www.tumblr.com/tagged/rebecca%20guay"
                        target="_blank"
                      >
                        Rebecca Guay
                      </a>
                    </ListItem>
                    <ListItem>
                      <a
                        href="https://www.tumblr.com/tagged/terese%20nielsen"
                        target="_blank"
                      >
                        Terese Nielsen
                      </a>
                    </ListItem>
                    <ListItem>
                      <a
                        href="https://www.tumblr.com/tagged/pablo%20uchida"
                        target="_blank"
                      >
                        Pablo Uchida
                      </a>
                    </ListItem>
                    <ListItem>
                      <a
                        href="https://www.tumblr.com/tagged/claude%20monet"
                        target="_blank"
                      >
                        Oscar-Claude Monet
                      </a>
                    </ListItem>
                    <ol>
                      <ListItem>
                        <a
                          href="https://en.wikipedia.org/wiki/Impressionism"
                          target="_blank"
                        >
                          Impressionism
                        </a>
                      </ListItem>
                      <ListItem>
                        <a
                          href="https://en.wikipedia.org/wiki/Modernism"
                          target="_blank"
                        >
                          Modernism
                        </a>
                      </ListItem>
                      <ListItem>
                        <a
                          href="https://en.wikipedia.org/wiki/En_plein_air"
                          target="_blank"
                        >
                          Painting Outdoors
                        </a>
                      </ListItem>
                    </ol>
                  </ol>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="messages">
            <AccordionTrigger>MESSAGES</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Messages in this library present a modern messaging experience
              through an MS-DOS–inspired aesthetic. Instead of rounded speech
              bubbles, messages appear in simple rectangular boxes, evoking a
              nostalgic, classic PC feel.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Message from="assistant">
                    You create the world of the dream, you bring the subject
                    into that dream, and they fill it with their subconscious.
                  </Message>
                  <Message from="user">
                    How could I ever acquire enough detail to make them think
                    that its reality?
                  </Message>
                  <Message from="assistant">
                    Well dreams, they feel real while we're in them, right? It's
                    only when we wake up that we realize how things are actually
                    strange.
                  </Message>
                  <Message from="user">
                    Let me ask you a question, you, you never really remember
                    the beginning of a dream do you? You always wind up right in
                    the middle of what's going on.
                  </Message>
                  <Message from="assistant">I guess, yeah.</Message>
                  <Message from="user">So how did we end up here?</Message>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="messages-interface">
            <AccordionTrigger>MESSAGES INTERFACE</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              This example combines the aesthetics of iMessage and IRSSI with a
              terminal-inspired design. It shows how easy it is to embed a
              simple web application into your website.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>MESSAGES</CardTitle>
                </CardHeader>
                <CardContent>
                  <MessagesInterface />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="modal">
            <AccordionTrigger>MODAL</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Modals overlay main content - Dialog component serves this purpose
              with sacred styling.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Open Modal</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>MODAL EXAMPLE</DialogTitle>
                      </DialogHeader>
                      <br />
                      <DialogDescription>
                        This modal uses the Dialog component which provides the
                        same functionality as traditional modals, with Radix UI
                        accessibility and sacred terminal styling.
                      </DialogDescription>
                      <br />
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button>Close</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="navigation-bar">
            <AccordionTrigger>NAVIGATION BAR</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Navigation bars for top-level navigation (requires Navigation
              component from sacred).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Navigation component - terminal-style navigation bar with
                    logo and actions
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="list">
            <AccordionTrigger>LIST</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Lists organize items in ordered or unordered formats.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol>
                    <ListItem>First item</ListItem>
                    <ListItem>Second item</ListItem>
                    <ListItem>Third item</ListItem>
                  </ol>
                  <br />
                  <ul>
                    <ListItem>Bullet one</ListItem>
                    <ListItem>Bullet two</ListItem>
                    <ListItem>Bullet three</ListItem>
                  </ul>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="popover">
            <AccordionTrigger>POPOVER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Popovers display contextual information using Radix UI Popover.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <RowSpaceBetween>
                    <Popover>
                      <PopoverTrigger asChild>
                        <ActionButton>TOP LEFT</ActionButton>
                      </PopoverTrigger>
                      <PopoverContent>
                        <p>This is popover content with sacred styling.</p>
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <ActionButton>TOP RIGHT</ActionButton>
                      </PopoverTrigger>
                      <PopoverContent>
                        <p>Another popover with distinctive borders.</p>
                      </PopoverContent>
                    </Popover>
                  </RowSpaceBetween>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="progress-bars">
            <AccordionTrigger>PROGRESS BARS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Progress bars display completion status with customizable fill
              characters.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Card>
                    <CardHeader mode="left">0%</CardHeader>
                    <CardContent>
                      <BarProgress progress={0} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader mode="left">25%</CardHeader>
                    <CardContent>
                      <BarProgress progress={25} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader mode="left">50%</CardHeader>
                    <CardContent>
                      <BarProgress progress={50} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader mode="left">75%</CardHeader>
                    <CardContent>
                      <BarProgress progress={75} fillChar="(✿﹏●)" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader mode="left">100%</CardHeader>
                    <CardContent>
                      <BarProgress progress={100} />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="radio">
            <AccordionTrigger>RADIO BUTTONS</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Radio buttons using Radix UI RadioGroup with sacred's diamond
              indicator.
              <br />
              <br />
              <CardDouble title="METHOD">
                You're at the very beginning of designing your operating system.
                How do you choose to start?
                <br />
                <br />
                <RadioGroup defaultValue="one">
                  <RadioGroupItem value="one">
                    Custom Linux Kernel Derivative: Start with a minimal Linux
                    kernel
                  </RadioGroupItem>
                  <RadioGroupItem value="two">
                    AOSP Base: Leverage an AOSP-derived HAL and system services
                  </RadioGroupItem>
                  <RadioGroupItem value="three">
                    Microkernel Approach: Implement a microkernel (e.g., seL4)
                  </RadioGroupItem>
                </RadioGroup>
              </CardDouble>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="select">
            <AccordionTrigger>SELECT</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Select components using Radix UI Select with sacred dropdown
              styling.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="table">
            <AccordionTrigger>TABLE</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Tables organize data in rows and columns with sacred styling.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>John Doe</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell>Admin</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Jane Smith</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell>User</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sidebar-layout">
            <AccordionTrigger>SIDEBAR LAYOUT</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Sidebars provide access to secondary actions or additional
              information (requires SidebarLayout component from sacred).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    SidebarLayout component - see sacred implementation for full
                    pattern
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="slider">
            <AccordionTrigger>SLIDER</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Sliders let users select a value or range from a continuum
              (requires NumberRangeSlider component from sacred).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    NumberRangeSlider component - interactive range selection
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="textarea">
            <AccordionTrigger>TEXT AREA</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Multi-line text input with sacred styling.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea />
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tooltip">
            <AccordionTrigger>TOOLTIP</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Tooltips provide additional context using Radix UI Tooltip.
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>EXAMPLE</CardTitle>
                </CardHeader>
                <CardContent>
                  <RowSpaceBetween>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ActionButton>TOP LEFT</ActionButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The future depends on what we do in the present.</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ActionButton>TOP RIGHT</ActionButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          An eye for an eye only ends up making the whole world
                          blind.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </RowSpaceBetween>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="treeview">
            <AccordionTrigger>TREEVIEW</AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
              Tree Views display hierarchical list structures (requires TreeView
              component from sacred).
              <br />
              <br />
              <Card>
                <CardHeader>
                  <CardTitle>FILE SYSTEM</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    TreeView component - hierarchical file/folder navigation
                    with expand/collapse
                  </p>
                </CardContent>
              </Card>
              <br />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Grid>

      <Grid>
        <ActionListItem icon="⭢" href="https://internet.dev" target="_blank">
          Hire our studio to build your applications
        </ActionListItem>
        <ActionListItem
          icon="⭢"
          href="https://github.com/internet-development/www-sacred"
          target="_blank"
        >
          View the SRCL source code
        </ActionListItem>
        <ActionListItem icon="⭢" href="https://vercel.com/home" target="_blank">
          Try our hosting provider Vercel
        </ActionListItem>
      </Grid>
    </div>
  );
};

export default Page;

const LANDSCAPES = [
  [
    "Sahara Desert",
    "The Sahara stretches across North Africa with shifting dunes that tower above the horizon. Even in its harsh sunlight and cold nights, resilient life finds a way to endure.",
  ],
  [
    "Grand Canyon",
    "Carved by the Colorado River, the Grand Canyon reveals layers of ancient rock. Its chasms echo with wind and the distant calls of raptors gliding through the afternoon sky.",
  ],
  [
    "Amazon Rainforest",
    "The Amazon Rainforest teems with biodiversity under a dense green canopy. Rivers and flooded plains sustain countless species, while humid air hangs heavy with the promise of storms.",
  ],
  [
    "Rocky Mountains",
    "The Rockies rise like rugged spines across the continent. Snowpack feeds rivers that carve valleys where elk graze, and fir trees cling to the slopes.",
  ],
  [
    "Gobi Desert",
    "The Gobi Desert rolls out in arid sweeps across northern China and southern Mongolia. Sparse grasses and hardy camels testify to its unforgiving climate.",
  ],
  [
    "Andes Mountains",
    "The Andes dominate western South America with ragged peaks and hidden valleys. Llamas graze on high plateaus, and glaciers feed the rivers far below.",
  ],
  [
    "Serengeti Plains",
    "The Serengeti spreads under the African sun in rolling grasslands. Wildebeests and zebras migrate in vast herds, guided by the promise of water and fresh pasture.",
  ],
  [
    "Yosemite Valley",
    "Glacial forces shaped this granite cradle in California. Towering waterfalls cascade from sheer cliffs, while giant sequoias stand in quiet strength.",
  ],
  [
    "Namib Desert",
    "The Namib Desert clings to the Atlantic coast of southern Africa. Rust-red dunes shift above hidden water tables where desert elephants roam.",
  ],
  [
    "Patagonia",
    "Patagonia’s windswept plains and jagged peaks stretch across Argentina and Chile. Glaciers calve into turquoise lakes, and guanacos graze on hardy grasses.",
  ],
  [
    "Swiss Alps",
    "The Swiss Alps rise with sharp spires of snow and ice. Mountain chalets cling to slopes where wildflowers bloom each summer in vibrant displays.",
  ],
  [
    "Himalayas",
    "The Himalayas hold the world’s highest summits beneath a freezing sky. From lush foothills to lofty glaciers, this range tests life’s resilience.",
  ],
  [
    "Icelandic Highlands",
    "Iceland’s interior stands stark and raw with volcanic plains, steaming vents, and glacier-fed rivers. The wind sweeps across moss-coated lava fields in lonely gusts.",
  ],
  [
    "Atacama Desert",
    "The Atacama is among the driest places on Earth. Its scorched soil and salt flats see rare blooms that burst into color after elusive rains.",
  ],
  [
    "Redwood Forest",
    "Coastal redwoods tower in perpetual mist along the Pacific. Their trunks, thick and ancient, cradle a hidden world of fern and moss.",
  ],
  [
    "Scottish Highlands",
    "The Highlands roll in rugged hills capped by heather and stone. Lochs reflect ever-shifting skies, and the wind carries the distant clang of sheep bells.",
  ],
  [
    "Great Rift Valley",
    "This massive geological trench cleaves eastern Africa, where lakes shimmer at the bottom of steep escarpments. Flamingos gather in vast flocks to feed on algae.",
  ],
  [
    "Okavango Delta",
    "The Okavango spreads like a bright labyrinth of channels and wetlands in Botswana. Seasonal floods create a green haven for elephants, lions, and hippos.",
  ],
  [
    "Appalachian Mountains",
    "Old and eroded, the Appalachians meander through eastern North America. Their forests host black bears, rhododendrons, and the misty quiet of forest hollows.",
  ],
  [
    "Death Valley",
    "Death Valley bakes under a relentless sun, reaching some of the hottest temperatures on record. Cracked salt flats testify to evaporated lakes and lost water.",
  ],
  [
    "Dolomites",
    "Jagged limestone peaks define northern Italy’s Dolomites. Alpine meadows lie below sheer cliffs, where climbers test themselves against silent stone.",
  ],
  [
    "Torres del Paine",
    "Chile’s Torres del Paine juts into the southern sky with glacier-fed lakes at its base. Guanacos roam windblown plains as ice cracks overhead.",
  ],
  [
    "Lofoten Islands",
    "Lofoten’s dramatic peaks rise straight from Norway’s cold seas. Fishing villages huddle along rocky shores, while gulls circle overhead in crisp air.",
  ],
  [
    "Siberian Tundra",
    "The Siberian tundra spans a realm of permafrost and low shrubs. Winters stretch long and bleak, yet migratory birds still find respite here each summer.",
  ],
  [
    "Norwegian Fjords",
    "Deep fjords carve into Norway’s coast where dark waters mirror towering cliffs. Small farms cling to green patches between rock and sea.",
  ],
  [
    "Bungle Bungle Range",
    "These striped sandstone domes rise from the Australian outback. Gorges cut deep under a harsh sun, hiding pockets of lush vegetation.",
  ],
  [
    "Zion Canyon",
    "Zion Canyon glows red and orange under the Utah sky. The Virgin River sculpts sheer walls that watch over narrow trails and hidden pools.",
  ],
  [
    "Lake Baikal",
    "Lake Baikal in Siberia is the world’s deepest lake. Its waters shimmer with unmatched clarity, home to species found nowhere else on Earth.",
  ],
  [
    "Banff National Park",
    "Banff crowns the Canadian Rockies with turquoise lakes and towering peaks. Grizzlies roam pine forests while glacier-fed rivers reflect untouched wilderness.",
  ],
  [
    "Wadi Rum",
    "Wadi Rum’s sandstone cliffs loom in Jordan’s desert, carved by millennia of wind and time. Nomadic tribes wander under a silent, star-filled sky.",
  ],
  [
    "Cappadocia",
    "Cappadocia’s whimsical rock formations rise over central Turkey’s plains. Soft stone spires hold hidden chapels and the ghosts of ancient dwellers.",
  ],
];

const SAMPLE_TABLE_DATA = [
  ["NAME", "SYMBOL", "PRICE", "HOLDINGS"],
  ["Bat", "BAT", "$9.01", "400"],
  ["Bear", "BR", "$56.78", "200"],
  ["Camel", "CML", "$55.67", "70"],
  ["Cheetah", "CHT", "$13.45", "150"],
  ["Crab", "CRB", "$15.67", "250"],
  ["Deer", "DER", "$29.99", "110"],
  ["Dolphin", "DLP", "$77.89", "50"],
  ["Eagle", "EGL", "$45.67", "90"],
  ["Falcon", "FLC", "$40.22", "85"],
  ["Fox", "FOX", "$12.34", "100"],
  ["Frog", "FRG", "$7.89", "400"],
  ["Giraffe", "GRF", "$44.56", "80"],
  ["Hedgehog", "HDG", "$11.23", "200"],
  ["Horse", "HRS", "$54.32", "70"],
  ["Kangaroo", "KNG", "$15.67", "120"],
  ["Koala", "KLA", "$22.34", "150"],
  ["Leopard", "LPR", "$14.56", "110"],
  ["Lemur", "LMR", "$11.12", "320"],
  ["Lion", "LION", "$67.89", "80"],
  ["Lynx", "LNX", "$16.78", "130"],
  ["Mouse", "MSE", "$5.12", "500"],
  ["Octopus", "OCT", "$88.90", "40"],
  ["Otter", "OTR", "$20.21", "180"],
  ["Owl", "OWL", "$19.01", "160"],
  ["Panda", "PND", "$78.90", "55"],
  ["Peacock", "PCK", "$12.34", "100"],
  ["Penguin", "PNG", "$33.45", "90"],
  ["Porcupine", "PRC", "$17.89", "140"],
  ["Rabbit", "RBT", "$9.10", "350"],
  ["Raccoon", "RCC", "$18.90", "150"],
  ["Shark", "SHK", "$89.01", "50"],
  ["Snake", "SNK", "$10.11", "300"],
  ["Squirrel", "SQL", "$10.12", "250"],
  ["Tiger", "TGR", "$34.56", "120"],
  ["Turtle", "TRL", "$66.78", "60"],
  ["Whale", "WHL", "$123.45", "30"],
  ["Wolf", "WLF", "$23.45", "150"],
  ["Zebra", "ZBR", "$65.43", "60"],
];
