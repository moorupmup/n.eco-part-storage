import sys
import os
import re

def main():
    version = sys.argv[1] if len(sys.argv) > 1 else ''

    # 0. Configure variables.gradle for minSdkVersion = 23, compileSdkVersion = 35 and targetSdkVersion = 35
    variables_path = 'android/variables.gradle'
    if os.path.exists(variables_path):
        with open(variables_path, 'r', encoding='utf-8') as f:
            v_code = f.read()
        v_code = re.sub(r'minSdkVersion\s*=\s*\d+', 'minSdkVersion = 23', v_code)
        v_code = re.sub(r'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 35', v_code)
        v_code = re.sub(r'targetSdkVersion\s*=\s*\d+', 'targetSdkVersion = 35', v_code)
        with open(variables_path, 'w', encoding='utf-8') as f:
            f.write(v_code)
        print(f"[CI] Updated minSdkVersion to 23, compileSdkVersion and targetSdkVersion to 35 in {variables_path}")

    # 0.1 Configure gradle.properties to disable strict minCompileSdk check
    props_path = 'android/gradle.properties'
    if os.path.exists(props_path):
        with open(props_path, 'r', encoding='utf-8') as f:
            p_code = f.read()
        lines_to_add = [
            'android.disableMinCompileSdkCheck=true',
            'android.suppressUnsupportedCompileSdk=35'
        ]
        for line in lines_to_add:
            if line not in p_code:
                p_code += f'\n{line}\n'
        with open(props_path, 'w', encoding='utf-8') as f:
            f.write(p_code)
        print(f"[CI] Injected android.disableMinCompileSdkCheck=true into {props_path}")
    
    # 1. Inject version & signingConfigs into android/app/build.gradle
    gradle_path = 'android/app/build.gradle'
    if os.path.exists(gradle_path):
        with open(gradle_path, 'r', encoding='utf-8') as f:
            code = f.read()

        if version and version != 'main':
            code = re.sub(r'versionName\s+["\'].*?["\']', f'versionName "{version}"', code)
            print(f"[CI] Injected versionName '{version}' into {gradle_path}")

        # Ensure minSdkVersion is at least 23, compileSdk and targetSdk are 35
        code = re.sub(r'minSdkVersion\s+rootProject\.ext\.minSdkVersion', 'minSdkVersion 23', code)
        code = re.sub(r'minSdkVersion\s+\d+', 'minSdkVersion 23', code)
        code = re.sub(r'compileSdkVersion\s+rootProject\.ext\.compileSdkVersion', 'compileSdkVersion 35', code)
        code = re.sub(r'compileSdkVersion\s+\d+', 'compileSdkVersion 35', code)
        code = re.sub(r'targetSdkVersion\s+rootProject\.ext\.targetSdkVersion', 'targetSdkVersion 35', code)
        code = re.sub(r'targetSdkVersion\s+\d+', 'targetSdkVersion 35', code)

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

        if 'xmlns:tools="http://schemas.android.com/tools"' not in code:
            code = code.replace('<manifest', '<manifest xmlns:tools="http://schemas.android.com/tools"')

        perm = '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />'
        if 'REQUEST_INSTALL_PACKAGES' not in code:
            code = code.replace('</manifest>', f'    {perm}\n</manifest>')
            print(f"[CI] Added REQUEST_INSTALL_PACKAGES permission to {manifest_path}")

        if 'android:usesCleartextTraffic="true"' not in code:
            code = code.replace('<application', '<application android:usesCleartextTraffic="true" android:networkSecurityConfig="@xml/network_security_config"')
            print(f"[CI] Enabled android:usesCleartextTraffic='true' and networkSecurityConfig in {manifest_path}")
        elif 'android:networkSecurityConfig' not in code:
            code = code.replace('<application', '<application android:networkSecurityConfig="@xml/network_security_config"')
            print(f"[CI] Enabled networkSecurityConfig in {manifest_path}")

        # Ensure minSdkVersion in manifest does not conflict with libraries requiring 23
        if '<uses-sdk' not in code:
            code = code.replace('<application', '<uses-sdk android:minSdkVersion="23" tools:overrideLibrary="com.google.android.gms.tasks" />\n    <application')
        else:
            code = re.sub(r'android:minSdkVersion="\d+"', 'android:minSdkVersion="23"', code)

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
        try {
            android.webkit.WebView wv = getBridge().getWebView();
            if (wv != null) {
                wv.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
        } catch (Exception ignored) {}
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
