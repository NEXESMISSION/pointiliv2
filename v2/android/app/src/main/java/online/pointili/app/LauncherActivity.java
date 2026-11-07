package online.pointili.app;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

/**
 * Pointili for Android: the site in Android's own WebView (6 Nov 2026 — a phone whose browser never
 * offered to install the site, and the first app, a Chrome TWA, still leaned on that browser). Nothing
 * else on the phone is needed: no Chrome, no Play services.
 *
 * Pointili's pages stay in the app, signed in across launches (cookies and storage kept); anything else —
 * WhatsApp, a call, another site — opens in its own app. The camera goes to the page's scanner after
 * Android's own question; a logo is picked with Android's file picker; the customers' file
 * (/api/export) lands in Downloads, signed in. The back button goes back a page. No network: a page that
 * says so, and tries again. The page knows it is in the app by «PointiliApp» in its user agent
 * (lib/pwa: no install button here; lib/track: counted as the app).
 */
public class LauncherActivity extends Activity {
    static final String HOME = "https://www.pointili.online/";
    static final String AGENT = " PointiliApp/2";
    static final int FILES = 1, CAMERA = 2, STORAGE = 3;
    static final int CANVAS = 0xFFF4F3F9;

    WebView web;
    ValueCallback<Uri[]> files;
    PermissionRequest camera;
    String[] pendingDownload;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        // a debug build only: the page can be looked at from a computer (the tests)
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(CANVAS);
        web = new WebView(this);
        web.setBackgroundColor(CANVAS);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        // Android 15 and later draw every app under the system bars: the page is kept clear of them and of the keyboard
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setSupportMultipleWindows(false);
        // the site sizes its own text: the phone's font setting must not enlarge it twice (Chrome does the same)
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + AGENT);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return leave(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) offline(request.getUrl().toString());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> askCamera(request));
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (files != null) files.onReceiveValue(null);
                files = callback;
                try {
                    startActivityForResult(params.createIntent(), FILES);
                    return true;
                } catch (ActivityNotFoundException e) {
                    files = null;
                    return false;
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, false, false);
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> download(url, agent, disposition, mime));

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
        }

        if (saved != null && web.restoreState(saved) != null) return;
        web.loadUrl(startOf(getIntent()));
    }

    /** Pointili's own address, or none. */
    static boolean ours(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        String host = u.getHost() == null ? "" : u.getHost();
        return (scheme.equals("https") || scheme.equals("http")) && (host.equals("pointili.online") || host.endsWith(".pointili.online"));
    }

    /** Pointili's pages stay here; anything else (WhatsApp, a call, another site) goes to its own app. */
    boolean leave(Uri u) {
        if (ours(u)) return false;
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        try {
            Intent i;
            if (scheme.equals("intent")) {
                i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                i.setComponent(null);
                i.setSelector(null);
                i.addCategory(Intent.CATEGORY_BROWSABLE);
            } else {
                i = new Intent(Intent.ACTION_VIEW, u);
            }
            startActivity(i);
        } catch (Exception e) {
            // an intent: link with nowhere to go on this phone: its fallback address, if it has one
            String fallback = scheme.equals("intent") ? fallbackOf(u.toString()) : null;
            if (fallback != null) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fallback)));
                } catch (Exception ignored) {
                    Toast.makeText(this, "ما نجمش نحلّ الرابط هذا", Toast.LENGTH_SHORT).show();
                }
            } else {
                Toast.makeText(this, "ما نجمش نحلّ الرابط هذا", Toast.LENGTH_SHORT).show();
            }
        }
        return true;
    }

    static String fallbackOf(String intentUrl) {
        int at = intentUrl.indexOf("S.browser_fallback_url=");
        if (at < 0) return null;
        String rest = intentUrl.substring(at + "S.browser_fallback_url=".length());
        int end = rest.indexOf(';');
        return Uri.decode(end < 0 ? rest : rest.substring(0, end));
    }

    String startOf(Intent i) {
        Uri u = i == null ? null : i.getData();
        return u != null && ours(u) ? u.toString() : HOME;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        if (i.getData() != null && ours(i.getData())) web.loadUrl(i.getData().toString());
    }

    void back() {
        if (web.canGoBack()) web.goBack();
        else finish();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /** The camera, for Pointili's own pages only, after Android's own question. */
    void askCamera(PermissionRequest request) {
        boolean wantsCamera = false;
        for (String r : request.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsCamera = true;
        if (!wantsCamera || !ours(request.getOrigin())) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            return;
        }
        if (camera != null) camera.deny();
        camera = request;
        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        boolean yes = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (code == CAMERA && camera != null) {
            if (yes) camera.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else camera.deny();
            camera = null;
        } else if (code == STORAGE && pendingDownload != null) {
            String[] d = pendingDownload;
            pendingDownload = null;
            if (yes) download(d[0], d[1], d[2], d[3]);
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code == FILES && files != null) {
            files.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            files = null;
            return;
        }
        super.onActivityResult(code, result, data);
    }

    /** A file from Pointili (the customers' list): into Downloads, with the person's session. */
    @SuppressWarnings("deprecation")
    void download(String url, String agent, String disposition, String mime) {
        if (url == null || !url.startsWith("http")) {
            Toast.makeText(this, "ما نجمش نحمّل الفيشي هذا هوني", Toast.LENGTH_SHORT).show();
            return;
        }
        // Android 9 and before ask once before writing into Downloads
        if (Build.VERSION.SDK_INT < 29 && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingDownload = new String[]{url, agent, disposition, mime};
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE);
            return;
        }
        String name = URLUtil.guessFileName(url, disposition, mime);
        DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
        String cookie = CookieManager.getInstance().getCookie(url);
        if (cookie != null) r.addRequestHeader("Cookie", cookie);
        r.addRequestHeader("User-Agent", agent);
        if (mime != null) r.setMimeType(mime);
        r.setTitle(name);
        r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
        if (Build.VERSION.SDK_INT < 29) r.allowScanningByMediaScanner();
        ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
        Toast.makeText(this, "⬇ " + name, Toast.LENGTH_SHORT).show();
    }

    /** No network (or the site did not answer): a page that says so, and tries the same page again. */
    void offline(String url) {
        String retry = url != null && url.startsWith("https://") ? url.replace("'", "%27").replace("\"", "%22").replace("<", "%3C") : HOME;
        String html = "<!doctype html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
                + "<body style='margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;"
                + "font-family:sans-serif;background:#F4F3F9;color:#0F0E17;text-align:center;padding:24px;box-sizing:border-box'>"
                + "<div style='font-size:44px'>📶</div><b style='font-size:20px'>ما فمّاش إنترنت</b>"
                + "<div style='color:#6B6781;font-size:15px'>ثبّت في الكونيكسيون متاعك وعاود.</div>"
                + "<a href='" + retry + "' style='margin-top:8px;background:#6C47FF;color:#fff;text-decoration:none;font-weight:bold;"
                + "padding:14px 32px;border-radius:16px;font-size:17px'>عاود</a></body></html>";
        web.loadDataWithBaseURL(HOME, html, "text/html", "utf-8", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }
}
