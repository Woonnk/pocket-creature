param([int]$ParentPid)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Speech, System.Web.Extensions
$speechAssembly = [System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location
$jsonAssembly = [System.Web.Script.Serialization.JavaScriptSerializer].Assembly.Location
Add-Type -ReferencedAssemblies System.dll, System.Core.dll, $speechAssembly, $jsonAssembly -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Speech.Recognition;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
public static class PocketVoiceInput {
  private static readonly JavaScriptSerializer json = new JavaScriptSerializer();
  private static readonly object outputLock = new object();
  private static readonly ConcurrentQueue<Dictionary<string, object>> commands = new ConcurrentQueue<Dictionary<string, object>>();
  private static int revision = 0;
  private static volatile bool inputClosed = false;
  [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int key);
  private static bool Down(int key) { return (GetAsyncKeyState(key) & 0x8000) != 0; }
  private static void Emit(string state, int epoch, int id, string text, bool review, string language) {
    lock (outputLock) { Console.WriteLine(json.Serialize(new { state = state, epoch = epoch, id = id, text = text, needsReview = review, language = language })); Console.Out.Flush(); }
  }
  private sealed class Capture : IDisposable {
    [StructLayout(LayoutKind.Sequential, Pack = 2)] private struct WaveFormat { public ushort tag, channels; public uint samples, average; public ushort align, bits, extra; }
    [StructLayout(LayoutKind.Sequential)] private struct Header { public IntPtr data; public uint length, recorded; public UIntPtr user; public uint flags, loops; public IntPtr next; public UIntPtr reserved; }
    private delegate void WaveProc(IntPtr wave, uint message, IntPtr instance, IntPtr param1, IntPtr param2);
    [DllImport("winmm.dll")] private static extern uint waveInOpen(out IntPtr wave, uint device, ref WaveFormat format, WaveProc callback, IntPtr instance, uint flags);
    [DllImport("winmm.dll")] private static extern uint waveInPrepareHeader(IntPtr wave, IntPtr header, uint size);
    [DllImport("winmm.dll")] private static extern uint waveInUnprepareHeader(IntPtr wave, IntPtr header, uint size);
    [DllImport("winmm.dll")] private static extern uint waveInAddBuffer(IntPtr wave, IntPtr header, uint size);
    [DllImport("winmm.dll")] private static extern uint waveInStart(IntPtr wave);
    [DllImport("winmm.dll")] private static extern uint waveInStop(IntPtr wave);
    [DllImport("winmm.dll")] private static extern uint waveInReset(IntPtr wave);
    [DllImport("winmm.dll")] private static extern uint waveInClose(IntPtr wave);
    private readonly MemoryStream pcm = new MemoryStream();
    private readonly object gate = new object();
    private readonly List<Tuple<IntPtr, IntPtr>> buffers = new List<Tuple<IntPtr, IntPtr>>();
    private readonly ConcurrentQueue<IntPtr> returned = new ConcurrentQueue<IntPtr>();
    private readonly WaveProc callback;
    private IntPtr handle = IntPtr.Zero;
    private volatile bool recording;
    private bool disposed;
    private readonly uint headerSize = (uint)Marshal.SizeOf(typeof(Header));
    public Capture() {
      callback = Receive;
      var format = new WaveFormat { tag = 1, channels = 1, samples = 16000, average = 32000, align = 2, bits = 16, extra = 0 };
      try {
        if (waveInOpen(out handle, 0xffffffff, ref format, callback, IntPtr.Zero, 0x30000) != 0) { handle = IntPtr.Zero; throw new InvalidOperationException(); }
        for (int i = 0; i < 4; i++) {
          IntPtr data = Marshal.AllocHGlobal(3200), header = Marshal.AllocHGlobal((int)headerSize);
          buffers.Add(Tuple.Create(data, header));
          Marshal.StructureToPtr(new Header { data = data, length = 3200 }, header, false);
          if (waveInPrepareHeader(handle, header, headerSize) != 0 || waveInAddBuffer(handle, header, headerSize) != 0) throw new InvalidOperationException();
        }
        recording = true;
        if (waveInStart(handle) != 0) throw new InvalidOperationException();
      } catch { Dispose(); throw; }
    }
    private void Receive(IntPtr wave, uint message, IntPtr instance, IntPtr param1, IntPtr param2) {
      if (message != 0x3c0) return;
      lock (gate) {
        if (disposed) return;
        var header = (Header)Marshal.PtrToStructure(param1, typeof(Header));
        int count = (int)Math.Min(header.recorded, header.length);
        count = Math.Min(count, 640000 - (int)pcm.Length);
        if (count > 0) { var data = new byte[count]; Marshal.Copy(header.data, data, 0, count); pcm.Write(data, 0, count); }
        if (recording) returned.Enqueue(param1);
      }
    }
    // WinMM callbacks must not invoke wave functions: requeue on the control thread.
    public void Pump() { IntPtr header; while (recording && returned.TryDequeue(out header)) { if (waveInAddBuffer(handle, header, headerSize) != 0) throw new InvalidOperationException(); } }
    public byte[] Finish() {
      CloseDevice();
      byte[] data; lock (gate) data = pcm.ToArray();
      if (data.Length < 6400) return new byte[0];
      using (var stream = new MemoryStream()) using (var writer = new BinaryWriter(stream)) {
        writer.Write(Encoding.ASCII.GetBytes("RIFF")); writer.Write(36 + data.Length); writer.Write(Encoding.ASCII.GetBytes("WAVEfmt "));
        writer.Write(16); writer.Write((short)1); writer.Write((short)1); writer.Write(16000); writer.Write(32000); writer.Write((short)2); writer.Write((short)16);
        writer.Write(Encoding.ASCII.GetBytes("data")); writer.Write(data.Length); writer.Write(data); writer.Flush(); return stream.ToArray();
      }
    }
    private void CloseDevice() {
      recording = false;
      if (handle == IntPtr.Zero) return;
      waveInStop(handle); waveInReset(handle);
      foreach (var pair in buffers) waveInUnprepareHeader(handle, pair.Item2, headerSize);
      if (waveInClose(handle) != 0) Environment.Exit(1);
      handle = IntPtr.Zero;
    }
    public void Dispose() {
      CloseDevice();
      lock (gate) { if (disposed) return; disposed = true; foreach (var pair in buffers) { Marshal.FreeHGlobal(pair.Item1); Marshal.FreeHGlobal(pair.Item2); } buffers.Clear(); pcm.Dispose(); }
    }
  }
  private static void Decode(byte[] wave, RecognizerInfo info, int token, int epoch, int id, bool truncated) {
    try {
      if (wave.Length == 0) { if (token == Interlocked.CompareExchange(ref revision, 0, 0)) Emit("empty", epoch, id, "", false, info.Culture.Name); return; }
      string text = ""; float confidence = 1; int phrases = 0;
      using (var recognizer = new SpeechRecognitionEngine(info.Id)) using (var input = new MemoryStream(wave)) {
        recognizer.LoadGrammar(new DictationGrammar()); recognizer.InitialSilenceTimeout = TimeSpan.FromSeconds(1); recognizer.EndSilenceTimeout = TimeSpan.FromMilliseconds(350);
        recognizer.SetInputToWaveStream(input);
        while (token == Interlocked.CompareExchange(ref revision, 0, 0) && phrases++ < 24 && text.Length < 1200) {
          var result = recognizer.Recognize(); if (result == null) break;
          if (result.Confidence >= .2f) { text += (text.Length > 0 ? " " : "") + result.Text; confidence = Math.Min(confidence, result.Confidence); }
        }
      }
      if (token != Interlocked.CompareExchange(ref revision, 0, 0)) return;
      if (text.Length > 1200) text = text.Substring(0, 1200);
      Emit(text.Length > 0 ? "transcript" : "empty", epoch, id, text, truncated || confidence < .45f, info.Culture.Name);
    } catch { if (token == Interlocked.CompareExchange(ref revision, 0, 0)) Emit("error", epoch, id, "", false, info.Culture.Name); }
  }
  public static void Run(int parentPid) {
    int epoch = 0, key = 120, id = 0; Capture capture = null; bool button = false, blocked = true; long began = 0;
    try {
      var config = json.Deserialize<Dictionary<string, object>>(Console.ReadLine()); epoch = Convert.ToInt32(config["epoch"]); key = Convert.ToInt32(config["key"]);
      if (key < 119 || key > 121) throw new ArgumentException();
      RecognizerInfo info = null;
      foreach (var candidate in SpeechRecognitionEngine.InstalledRecognizers()) { if (info == null || candidate.Culture.Name == CultureInfo.CurrentUICulture.Name) info = candidate; }
      if (info == null) { Emit("error", epoch, 0, "", false, ""); return; }
      var reader = new Thread(delegate() { try { string line; while ((line = Console.ReadLine()) != null) { try { commands.Enqueue(new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(line)); } catch {} } } finally { inputClosed = true; } }); reader.IsBackground = true; reader.Start();
      Emit("ready", epoch, 0, "", false, info.Culture.Name);
      var clock = Stopwatch.StartNew();
      using (var parent = Process.GetProcessById(parentPid)) {
        while (!parent.HasExited && !inputClosed) {
          Dictionary<string, object> command; bool cancelled = false;
          while (commands.TryDequeue(out command)) {
            string action = command.ContainsKey("command") ? (string)command["command"] : "";
            int requestedEpoch = command.ContainsKey("epoch") ? Convert.ToInt32(command["epoch"]) : epoch;
            if (action == "cancel") { epoch = requestedEpoch; Interlocked.Increment(ref revision); button = false; blocked = true; if (capture != null) { capture.Dispose(); capture = null; } cancelled = true; }
            else if (requestedEpoch == epoch && action == "start") button = true;
            else if (requestedEpoch == epoch && action == "finish") button = false;
          }
          bool hotkey = Down(0x11) && Down(0x10) && Down(key);
          if (capture != null) capture.Pump();
          bool held = button || hotkey;
          if (!held) blocked = false;
          if (!cancelled && held && !blocked && capture == null) {
            Interlocked.Increment(ref revision);
            try { capture = new Capture(); began = clock.ElapsedMilliseconds; id++; Emit("listening", epoch, id, "", false, info.Culture.Name); }
            catch { blocked = true; Emit("error", epoch, 0, "", false, info.Culture.Name); }
          }
          if (capture != null && (!held || clock.ElapsedMilliseconds - began >= 20000)) {
            bool truncated = held; byte[] wave = capture.Finish(); capture.Dispose(); capture = null; blocked = true;
            int token = Interlocked.CompareExchange(ref revision, 0, 0), runEpoch = epoch, runId = id;
            Emit("transcribing", runEpoch, runId, "", false, info.Culture.Name);
            var worker = new Thread(delegate() { Decode(wave, info, token, runEpoch, runId, truncated); }); worker.IsBackground = true; worker.Start();
          }
          Thread.Sleep(20);
        }
      }
    } catch { Emit("error", epoch, 0, "", false, ""); }
    finally { Interlocked.Increment(ref revision); if (capture != null) capture.Dispose(); }
  }
}
'@
[PocketVoiceInput]::Run($ParentPid)
