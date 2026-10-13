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

    # 2. Configure Android Permissions for In-App Updates in AndroidManifest.xml
    manifest_path = 'android/app/src/main/AndroidManifest.xml'
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            code = f.read()

        perm = '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />'
        if 'REQUEST_INSTALL_PACKAGES' not in code:
            code = code.replace('</manifest>', f'    {perm}\n</manifest>')
            print(f"[CI] Added REQUEST_INSTALL_PACKAGES permission to {manifest_path}")

        # 3. Configure Android Home Screen Widget receiver in AndroidManifest.xml
        receiver_tag = """
        <receiver android:name=".NecoPartsWidgetProvider" android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/widget_info" />
        </receiver>
"""
        if 'NecoPartsWidgetProvider' not in code:
            code = code.replace('</application>', f'{receiver_tag}\n    </application>')
            print(f"[CI] Injected NecoPartsWidgetProvider receiver into {manifest_path}")

        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(code)
    else:
        print(f"[CI] Warning: {manifest_path} not found")

    # 4. Copy Java sources (Widget Provider & Plugin) to android/app/src/main/java/com/necopart/storage/
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

    # 5. Register NecoWidgetPlugin in MainActivity.java
    main_activity_path = os.path.join(target_java_dir, 'MainActivity.java')
    if os.path.exists(main_activity_path):
        with open(main_activity_path, 'r', encoding='utf-8') as f:
            m_code = f.read()

        if 'registerPlugin(NecoWidgetPlugin.class)' not in m_code:
            if 'onCreate' in m_code:
                m_code = m_code.replace('super.onCreate(savedInstanceState);', 'registerPlugin(NecoWidgetPlugin.class);\n        super.onCreate(savedInstanceState);')
            else:
                on_create_block = """    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NecoWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}"""
                m_code = re.sub(r'\}\s*$', on_create_block, m_code)
            with open(main_activity_path, 'w', encoding='utf-8') as f:
                f.write(m_code)
            print(f"[CI] Registered NecoWidgetPlugin in {main_activity_path}")

if __name__ == '__main__':
    main()
