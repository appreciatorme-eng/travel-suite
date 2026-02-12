# Keep Firebase messaging classes used via reflection.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep Flutter engine/plugin entrypoints.
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Keep app's model annotations if reflection is used by serializers.
-keepattributes *Annotation*
