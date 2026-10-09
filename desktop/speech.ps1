param([int]$ParentPid)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Speech, System.Web.Extensions
$speechAssembly = [System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location
$jsonAssembly = [System.Web.Script.Serialization.JavaScriptSerializer].Assembly.Location
Add-Type -ReferencedAssemblies System.dll, System.Core.dll, $speechAssembly, $jsonAssembly -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Speech.Synthesis;
using System.Threading;
using System.Web.Script.Serialization;
public static class PocketSpeech {
  public static void Run(string input, int parentPid) {
    var json = new JavaScriptSerializer();
    using (var watch = new Timer(delegate(object state) {
      try { if (Process.GetProcessById(parentPid).HasExited) Environment.Exit(0); }
      catch { Environment.Exit(0); }
    }, null, 1000, 1000)) {
      try {
        var command = json.Deserialize<Dictionary<string, object>>(input);
        using (var synth = new SpeechSynthesizer()) {
          if ((string)command["command"] == "voices") {
            var voices = new List<object>();
            foreach (var voice in synth.GetInstalledVoices()) {
              if (voice.Enabled) voices.Add(new { name = voice.VoiceInfo.Name, lang = voice.VoiceInfo.Culture.Name });
            }
            Console.WriteLine(json.Serialize(new { voices = voices }));
            return;
          }
          string text = (string)command["text"];
          if (text.Length > 280) throw new ArgumentException("Text too long");
          string requested = (string)command["voice"];
          if (!String.IsNullOrEmpty(requested)) {
            bool found = false;
            foreach (var voice in synth.GetInstalledVoices()) {
              if (voice.Enabled && voice.VoiceInfo.Name == requested) { synth.SelectVoice(requested); found = true; break; }
            }
            if (!found) throw new ArgumentException("Selected voice unavailable");
          }
          synth.Volume = Math.Max(0, Math.Min(100, Convert.ToInt32(command["volume"])));
          synth.Rate = Math.Max(-5, Math.Min(5, Convert.ToInt32(command["rate"])));
          synth.SetOutputToDefaultAudioDevice();
          synth.SpeakStarted += delegate { Console.WriteLine("{\"state\":\"speaking\"}"); Console.Out.Flush(); };
          synth.Speak(text);
          Console.WriteLine("{\"state\":\"ended\"}");
        }
      } catch { Console.WriteLine("{\"state\":\"error\"}"); }
    }
  }
}
'@
[PocketSpeech]::Run([Console]::In.ReadToEnd(), $ParentPid)
