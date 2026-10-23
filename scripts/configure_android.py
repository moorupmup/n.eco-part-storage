import sys
import os
import re

def main():
    version = sys.argv[1] if len(sys.argv) > 1 else ''
    
    # 1. Inject version & signingConfigs into android/app/build.gradle
    gradle_path = 'android/app/build.gradle'
    if os.path.exists(gradle_path):
        with open(gradle_path, 'r', encoding='utf-8') as f:
            code = f.read()

        if version and version != 'main':
            code = re.sub(r'versionName\s+["\'].*?["\']', f'versionName "{version}"', code)
            print(f"[CI] Injected versionName '{version}' into {gradle_path}")

        signing_block = """
    signingConfigs {
        release {
            storeFile file('keystore/release.keystore')
            storePassword 'necopart2026'
            keyAlias 'necopart'
            keyPassword 'necopart2026'
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
"""
        if 'signingConfigs {' not in code:
            code = code.replace('buildTypes {', signing_block + '\n    buildTypes {')
            code = code.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release')
            print(f"[CI] Injected permanent release signingConfigs into {gradle_path}")

        with open(gradle_path, 'w', encoding='utf-8') as f:
            f.write(code)
    else:
        print(f"[CI] Warning: {gradle_path} not found")

    # 2. Configure Android Permissions & Options in AndroidManifest.xml
    manifest_path = 'android/app/src/main/AndroidManifest.xml'
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            code = f.read()

        perm = '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />'
        if 'REQUEST_INSTALL_PACKAGES' not in code:
            code = code.replace('</manifest>', f'    {perm}\n</manifest>')
            print(f"[CI] Added REQUEST_INSTALL_PACKAGES permission to {manifest_path}")

        if 'android:usesCleartextTraffic="true"' not in code:
            code = code.replace('<application', '<application android:usesCleartextTraffic="true"')
            print(f"[CI] Enabled android:usesCleartextTraffic='true' in {manifest_path}")

        # 3. Configure Android Home Screen Widget receivers in AndroidManifest.xml
        receiver_tags = """
        <!-- 1. Compact Informative Widget -->
        <receiver android:name=".NecoPartsWidgetProvider" android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/widget_info_compact" />
        </receiver>

        <!-- 2. Functional Quick Action Widget (Search, Write-Off, Stock-In, Deficit) -->
        <receiver android:name=".NecoQuickActionWidgetProvider" android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/widget_info_functional" />
        </receiver>
"""
        if 'NecoQuickActionWidgetProvider' not in code:
            if 'NecoPartsWidgetProvider' in code:
                # Replace old single provider block
                code = re.sub(r'<receiver android:name="\.NecoPartsWidgetProvider".*?</receiver>', '', code, flags=re.DOTALL)
            code = code.replace('</application>', f'{receiver_tags}\n    </application>')
            print(f"[CI] Injected NecoPartsWidgetProvider and NecoQuickActionWidgetProvider receivers into {manifest_path}")

        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(code)
    else:
        print(f"[CI] Warning: {manifest_path} not found")

    # 4. Copy Android Resources (Widgets layout, drawables, xml, strings) to android/app/src/main/res/
    res_src_dir = 'android-res'
    target_res_dir = 'android/app/src/main/res'
    if os.path.exists(res_src_dir) and os.path.exists(target_res_dir):
        import shutil
        for root, dirs, files in os.walk(res_src_dir):
            rel = os.path.relpath(root, res_src_dir)
            dest_folder = os.path.join(target_res_dir, rel) if rel != '.' else target_res_dir
            os.makedirs(dest_folder, exist_ok=True)
            for f in files:
                shutil.copy2(os.path.join(root, f), os.path.join(dest_folder, f))
        print(f"[CI] Synced {res_src_dir} to {target_res_dir}")

    # 5. Copy Java sources (Widget Providers & Plugin) to android/app/src/main/java/com/necopart/storage/
    src_dir = 'android-src'
    target_java_dir = 'android/app/src/main/java/com/necopart/storage'
    if os.path.exists(src_dir):
        os.makedirs(target_java_dir, exist_ok=True)
        for fname in os.listdir(src_dir):
            if fname.endswith('.java'):
                src_file = os.path.join(src_dir, fname)
                dest_file = os.path.join(target_java_dir, fname)
                with open(src_file, 'r', encoding='utf-8') as sf:
                    content = sf.read()
                with open(dest_file, 'w', encoding='utf-8') as df:
                    df.write(content)
                print(f"[CI] Copied {fname} to {target_java_dir}")

    # 6. Register NecoWidgetPlugin and Intent Handler in MainActivity.java
    main_activity_path = os.path.join(target_java_dir, 'MainActivity.java')
    if os.path.exists(main_activity_path):
        with open(main_activity_path, 'r', encoding='utf-8') as f:
            m_code = f.read()

        intent_handler_code = """
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NecoWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        handleWidgetIntent(getIntent());
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(android.content.Intent intent) {
        if (intent != null) {
            String act = intent.getStringExtra("quick_action");
            if (act == null && intent.getAction() != null) {
                if ("ACTION_WRITEOFF".equals(intent.getAction())) act = "writeoff";
                else if ("ACTION_STOCK_IN".equals(intent.getAction())) act = "stock_in";
                else if ("ACTION_SEARCH".equals(intent.getAction())) act = "search";
                else if ("ACTION_DEFICIT".equals(intent.getAction())) act = "deficit";
            }
            if (act != null) {
                NecoWidgetPlugin.setPendingAction(act);
            }
        }
    }
}"""
        if 'handleWidgetIntent' not in m_code:
            # Strip previous onCreate or closing brace and replace
            m_code = re.sub(r'@Override\s+public void onCreate.*?\}\s*\}', '}', m_code, flags=re.DOTALL)
            m_code = re.sub(r'\}\s*$', intent_handler_code, m_code)
            with open(main_activity_path, 'w', encoding='utf-8') as f:
                f.write(m_code)
            print(f"[CI] Injected NecoWidgetPlugin registration and handleWidgetIntent into {main_activity_path}")

if __name__ == '__main__':
    main()
