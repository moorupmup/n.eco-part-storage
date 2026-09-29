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
            with open(manifest_path, 'w', encoding='utf-8') as f:
                f.write(code)
            print(f"[CI] Added REQUEST_INSTALL_PACKAGES permission to {manifest_path}")
    else:
        print(f"[CI] Warning: {manifest_path} not found")

if __name__ == '__main__':
    main()
