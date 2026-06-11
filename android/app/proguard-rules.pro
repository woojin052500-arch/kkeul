# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve line number information for Google Play Console deobfuscation (mapping.txt)
-keepattributes SourceFile,LineNumberTable

# Capacitor Proguard rules to avoid breaking webview native bridge
-keep class com.getcapacitor.** { *; }
-keepclasseswithmembers class * {
  @com.getcapacitor.PluginMethod public <methods>;
}
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * extends com.getcapacitor.bridge.Bridge { *; }

# Awesome Cordova Plugins (Calendar, etc.) Proguard fallback
-keep class org.apache.cordova.** { *; }
-keep class org.awesome.cordova.** { *; }
