/**
 * UI 组件示例展示页面
 * 展示所有 @hamhome/ui 包中的基础组件
 */

import React from "react";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/card";
import { Label } from "../components/label";
import { Badge } from "../components/badge";
import { Separator } from "../components/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/select";
import { Switch } from "../components/switch";
import { Textarea } from "../components/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/dialog";
import { Progress } from "../components/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs";
import { Checkbox } from "../components/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/alert-dialog";
import { ScrollArea } from "../components/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/collapsible";
import { Alert, AlertDescription, AlertTitle } from "../components/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/accordion";
import { RadioGroup, RadioGroupItem } from "../components/radio-group";
import { Slider } from "../components/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/table";

/**
 * ComponentShowcase 组件展示页面
 */
export function ComponentShowcase() {
  const [progress, setProgress] = React.useState(33);
  const [sliderValue, setSliderValue] = React.useState([50]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">UI Component Showcase</h1>
          <p className="text-gray-400">
            @hamhome/ui - 基于 shadcn/ui 的共享组件库
          </p>
        </div>

        <Separator className="bg-gray-800" />

        {/* 表单组件区域 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">表单组件</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 订阅升级表单 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle>Upgrade your subscription</CardTitle>
                <CardDescription className="text-gray-400">
                  You are currently on the free plan. Upgrade to the pro plan to get access to all features.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Evil Rabbit" 
                      className="bg-[#0A0A0A] border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="example@acme.com" 
                      className="bg-[#0A0A0A] border-gray-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Card Number</Label>
                  <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
                    <Input 
                      placeholder="1234 1234 1234 1234" 
                      className="bg-[#0A0A0A] border-gray-700"
                    />
                    <Input 
                      placeholder="MM/YY" 
                      className="bg-[#0A0A0A] border-gray-700"
                    />
                    <Input 
                      placeholder="CVC" 
                      className="bg-[#0A0A0A] border-gray-700"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Plan</Label>
                  <p className="text-sm text-gray-400">Select the plan that best fits your needs.</p>
                  <RadioGroup defaultValue="starter" className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="starter" id="starter" className="mt-1" />
                      <div className="space-y-1">
                        <Label htmlFor="starter" className="font-medium cursor-pointer">
                          Starter Plan
                        </Label>
                        <p className="text-sm text-gray-400">Perfect for small businesses.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="pro" id="pro" className="mt-1" />
                      <div className="space-y-1">
                        <Label htmlFor="pro" className="font-medium cursor-pointer">
                          Pro Plan
                        </Label>
                        <p className="text-sm text-gray-400">More features and storage.</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes"
                    placeholder="Enter notes" 
                    className="bg-[#0A0A0A] border-gray-700 min-h-[80px]"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" />
                    <Label htmlFor="terms" className="cursor-pointer">
                      I agree to the terms and conditions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="emails" defaultChecked />
                    <Label htmlFor="emails" className="cursor-pointer">
                      Allow us to send you emails
                    </Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="ghost">Cancel</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Upgrade Plan
                </Button>
              </CardFooter>
            </Card>

            {/* 账号创建表单 */}
            <div className="space-y-6">
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription className="text-gray-400">
                    Enter your email below to create your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="bg-[#0A0A0A] border-gray-700">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </Button>
                    <Button variant="outline" className="bg-[#0A0A0A] border-gray-700">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#1A1A1A] px-2 text-gray-400">Or continue with</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email"
                      type="email"
                      placeholder="m@example.com" 
                      className="bg-[#0A0A0A] border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password"
                      type="password"
                      className="bg-[#0A0A0A] border-gray-700"
                    />
                  </div>

                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Create account
                  </Button>
                </CardContent>
              </Card>

              {/* 聊天界面示例 */}
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-gray-700">S</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Sofia Davis</p>
                        <p className="text-sm text-gray-400">m@example.com</p>
                      </div>
                    </div>
                    <Button size="icon" className="rounded-full bg-teal-600 hover:bg-teal-700">
                      <span className="text-xl">+</span>
                    </Button>
                  </div>

                  <Separator className="bg-gray-700" />

                  <ScrollArea className="h-[200px] pr-4">
                    <div className="space-y-4">
                      <div className="text-sm text-gray-300">
                        Hi, how can I help you today?
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
                          Hey, I'm having trouble with my account.
                        </div>
                      </div>
                      <div className="text-sm text-gray-300">
                        What seems to be the problem?
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
                          I can't log in.
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Separator className="bg-gray-800" />

        {/* 基础组件区域 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">基础组件</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Button 按钮 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Button 按钮</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">🔍</Button>
                </div>
              </CardContent>
            </Card>

            {/* Badge 徽章 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Badge 徽章</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Switch 开关 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Switch 开关</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch id="switch1" />
                  <Label htmlFor="switch1">Airplane Mode</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="switch2" defaultChecked />
                  <Label htmlFor="switch2">Notifications</Label>
                </div>
              </CardContent>
            </Card>

            {/* Select 选择器 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Select 选择器</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Choose a fruit</Label>
                <Select>
                  <SelectTrigger className="bg-[#0A0A0A] border-gray-700">
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Progress ���度条 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Progress 进度条</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
                <Button 
                  size="sm"
                  onClick={() => setProgress((prev) => (prev + 10) % 100)}
                >
                  Increase
                </Button>
              </CardContent>
            </Card>

            {/* Slider 滑块 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Slider 滑块</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Value</span>
                    <span>{sliderValue[0]}</span>
                  </div>
                  <Slider 
                    value={sliderValue} 
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Avatar 头像 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Avatar 头像</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback className="bg-indigo-600">SD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback className="bg-teal-600">JD</AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>

            {/* Tooltip 提示框 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Tooltip 提示框</CardTitle>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This is a tooltip</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Alert 警告框 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Alert 警告框</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="bg-[#0A0A0A] border-gray-700">
                  <AlertTitle>Heads up!</AlertTitle>
                  <AlertDescription className="text-sm">
                    You can add components to your app.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="bg-gray-800" />

        {/* 交互组件区域 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">交互组件</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabs 标签页 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle>Tabs 标签页</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="account" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-[#0A0A0A]">
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                  </TabsList>
                  <TabsContent value="account" className="space-y-3 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="tab-name">Name</Label>
                      <Input 
                        id="tab-name" 
                        defaultValue="Pedro Duarte" 
                        className="bg-[#0A0A0A] border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tab-username">Username</Label>
                      <Input 
                        id="tab-username" 
                        defaultValue="@peduarte" 
                        className="bg-[#0A0A0A] border-gray-700"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="password" className="space-y-3 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="current">Current password</Label>
                      <Input 
                        id="current" 
                        type="password" 
                        className="bg-[#0A0A0A] border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new">New password</Label>
                      <Input 
                        id="new" 
                        type="password" 
                        className="bg-[#0A0A0A] border-gray-700"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Accordion 手风琴 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle>Accordion 手风琴</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-gray-700">
                    <AccordionTrigger>Is it accessible?</AccordionTrigger>
                    <AccordionContent className="text-gray-400">
                      Yes. It adheres to the WAI-ARIA design pattern.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-gray-700">
                    <AccordionTrigger>Is it styled?</AccordionTrigger>
                    <AccordionContent className="text-gray-400">
                      Yes. It comes with default styles that matches the other components.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-gray-700">
                    <AccordionTrigger>Is it animated?</AccordionTrigger>
                    <AccordionContent className="text-gray-400">
                      Yes. It's animated by default, but you can disable it.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Collapsible 折叠面板 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle>Collapsible 折叠面板</CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible className="space-y-2">
                  <div className="flex items-center justify-between space-x-4">
                    <h4 className="text-sm font-semibold">
                      @peduarte starred 3 repositories
                    </h4>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <span className="sr-only">Toggle</span>
                        ▼
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-2">
                    <div className="rounded-md border border-gray-700 px-4 py-2 text-sm bg-[#0A0A0A]">
                      @radix-ui/primitives
                    </div>
                    <div className="rounded-md border border-gray-700 px-4 py-2 text-sm bg-[#0A0A0A]">
                      @radix-ui/colors
                    </div>
                    <div className="rounded-md border border-gray-700 px-4 py-2 text-sm bg-[#0A0A0A]">
                      @stitches/react
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Dialog 对话框 */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle>Dialog 对话框</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1A1A1A] border-gray-700">
                    <DialogHeader>
                      <DialogTitle>Edit profile</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Make changes to your profile here. Click save when you're done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="dialog-name">Name</Label>
                        <Input 
                          id="dialog-name" 
                          defaultValue="Pedro Duarte" 
                          className="bg-[#0A0A0A] border-gray-700"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dialog-username">Username</Label>
                        <Input 
                          id="dialog-username" 
                          defaultValue="@peduarte" 
                          className="bg-[#0A0A0A] border-gray-700"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button className="bg-indigo-600 hover:bg-indigo-700">
                        Save changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Open Alert Dialog</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#1A1A1A] border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This action cannot be undone. This will permanently delete your
                        account and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-[#0A0A0A] border-gray-700">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="bg-gray-800" />

        {/* Table 表格 */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Table 表格</h2>
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-[#0A0A0A]">
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-gray-700 hover:bg-[#0A0A0A]">
                    <TableCell className="font-medium">Alice Johnson</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Active</Badge>
                    </TableCell>
                    <TableCell>Developer</TableCell>
                    <TableCell className="text-right">$2,500</TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700 hover:bg-[#0A0A0A]">
                    <TableCell className="font-medium">Bob Smith</TableCell>
                    <TableCell>
                      <Badge>Active</Badge>
                    </TableCell>
                    <TableCell>Designer</TableCell>
                    <TableCell className="text-right">$2,200</TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700 hover:bg-[#0A0A0A]">
                    <TableCell className="font-medium">Charlie Brown</TableCell>
                    <TableCell>
                      <Badge variant="outline">Inactive</Badge>
                    </TableCell>
                    <TableCell>Manager</TableCell>
                    <TableCell className="text-right">$3,000</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

export default ComponentShowcase;
