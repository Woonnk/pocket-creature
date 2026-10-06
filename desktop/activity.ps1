param([int]$ParentPid, [int]$EnableTyping = 1)
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.dll, System.Core.dll, System.Windows.Forms.dll -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

public static class PocketActivity {
    private delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    private static readonly HookProc callback = CountKeyDown;
    private static IntPtr hook = IntPtr.Zero;
    private static int count = 0;
    [DllImport("user32.dll", SetLastError=true)] private static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr module, uint thread);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr value);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr value, int code, IntPtr message, IntPtr data);
    [DllImport("kernel32.dll", CharSet=CharSet.Auto)] private static extern IntPtr GetModuleHandle(string name);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr window, System.Text.StringBuilder text, int max);
    [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] private struct MonitorInfo { public uint Size; public Rect Monitor, Work; public uint Flags; }
    [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] private static extern bool IsZoomed(IntPtr window);
    [DllImport("dwmapi.dll")] private static extern int DwmGetWindowAttribute(IntPtr window, int attribute, out Rect rect, int size);
    [DllImport("dwmapi.dll", EntryPoint="DwmGetWindowAttribute")] private static extern int DwmGetWindowFlag(IntPtr window, int attribute, out int value, int size);
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] private static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
    [DllImport("user32.dll", CharSet=CharSet.Auto)] private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll")] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    private static IntPtr CountKeyDown(int code, IntPtr message, IntPtr data) {
        // Only count key-down events. Never read data, key codes, or typed characters.
        if (code >= 0 && (message.ToInt64() == 0x100 || message.ToInt64() == 0x104)) Interlocked.Increment(ref count);
        return CallNextHookEx(hook, code, message, data);
    }
    public static void Run(int parentPid, bool enableTyping) {
        // Obtain physical monitor coordinates; Electron converts them to DIP coordinates.
        try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch {}
        Process parent;
        try { parent = Process.GetProcessById(parentPid); } catch { return; }
        if (enableTyping) hook = SetWindowsHookEx(13, callback, GetModuleHandle(null), 0);
        try {
            var timer = Stopwatch.StartNew(); IntPtr lastWindow = IntPtr.Zero; bool lastShell = true;
            while (!parent.HasExited) {
                Application.DoEvents();
                if (timer.ElapsedMilliseconds >= 500) {
                    timer.Restart(); uint pid; string name = "", title = "", center = "null", surface = "null", windowId = ""; bool fullscreen = false;
                    IntPtr foreground = GetForegroundWindow();
                    GetWindowThreadProcessId(foreground, out pid);
                    try { using (var active = Process.GetProcessById((int)pid)) name = active.ProcessName; } catch {}
                    // Process names use a strict alphabet before entering JSON.
                    name = System.Text.RegularExpressions.Regex.Replace(name, "[^a-zA-Z0-9 ._+\\-]", "");
                    // Current foreground title lets the companion follow browser tabs and games.
                    // It is transient context: never collect typed text or write titles to disk.
                    if (pid != parentPid) {
                        var buffer = new System.Text.StringBuilder(512); GetWindowText(foreground, buffer, buffer.Capacity);
                        title = System.Text.RegularExpressions.Regex.Replace(buffer.ToString(), "[\\x00-\\x1f]", "").Replace("\\", "\\\\").Replace("\"", "\\\"");
                    }
                    if (pid != parentPid) {
                        lastWindow = foreground;
                        string lower = name.ToLowerInvariant();
                        lastShell = lower == "explorer" || lower == "dwm" || lower == "shellexperiencehost" || lower == "startmenuexperiencehost" || lower == "searchhost" || lower == "lockapp";
                    }
                    // Keep reading the last app's geometry while companion controls have focus.
                    // Invalid/minimized/hidden/cloaked windows immediately lose their surface.
                    if (lastWindow != IntPtr.Zero && IsWindow(lastWindow)) {
                        windowId = lastWindow.ToInt64().ToString(System.Globalization.CultureInfo.InvariantCulture);
                        Rect windowRect; var monitor = new MonitorInfo(); monitor.Size = (uint)Marshal.SizeOf(typeof(MonitorInfo));
                        if (GetWindowRect(lastWindow, out windowRect) && GetMonitorInfo(MonitorFromWindow(lastWindow, 2), ref monitor)) {
                            center = "{\"x\":" + ((monitor.Monitor.Left + monitor.Monitor.Right) / 2) + ",\"y\":" + ((monitor.Monitor.Top + monitor.Monitor.Bottom) / 2) + "}";
                            fullscreen = !lastShell && windowRect.Left <= monitor.Monitor.Left + 2 && windowRect.Top <= monitor.Monitor.Top + 2 && windowRect.Right >= monitor.Monitor.Right - 2 && windowRect.Bottom >= monitor.Monitor.Bottom - 2;
                            int cloaked = 0; try { DwmGetWindowFlag(lastWindow, 14, out cloaked, 4); } catch {}
                            if (!lastShell && IsWindowVisible(lastWindow) && !IsIconic(lastWindow) && cloaked == 0) {
                                Rect visible = windowRect; try { Rect frame; if (DwmGetWindowAttribute(lastWindow, 9, out frame, Marshal.SizeOf(typeof(Rect))) == 0) visible = frame; } catch {}
                                surface = "{\"id\":\"" + windowId + "\",\"bounds\":{\"x\":" + visible.Left + ",\"y\":" + visible.Top + ",\"width\":" + (visible.Right-visible.Left) + ",\"height\":" + (visible.Bottom-visible.Top) + "},\"maximized\":" + (IsZoomed(lastWindow) ? "true" : "false") + ",\"fullscreen\":" + (fullscreen ? "true" : "false") + "}";
                            }
                        }
                    }
                    Console.WriteLine("{\"process\":\"" + name + "\",\"typing\":" + Interlocked.Exchange(ref count, 0) + ",\"hook\":" + (hook != IntPtr.Zero ? "true" : "false") + ",\"self\":" + (pid == parentPid ? "true" : "false") + ",\"title\":\"" + title + "\",\"fullscreen\":" + (fullscreen ? "true" : "false") + ",\"monitorCenter\":" + center + ",\"windowId\":\"" + windowId + "\",\"windowSurface\":" + surface + "}");
                    Console.Out.Flush();
                }
                Thread.Sleep(10);
            }
        } finally { if (hook != IntPtr.Zero) UnhookWindowsHookEx(hook); parent.Dispose(); }
    }
}
'@
[PocketActivity]::Run($ParentPid, ($EnableTyping -eq 1))
