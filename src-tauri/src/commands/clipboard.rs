#[cfg(target_os = "macos")]
const NS_UTF8_STRING_ENCODING: usize = 4;

/// Writes text to the clipboard with `org.nspasteboard.ConcealedType` set,
/// which signals clipboard managers (Maccy, etc.) to skip recording the entry.
#[tauri::command]
pub fn write_secret_to_clipboard(text: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    unsafe {
        use objc2::runtime::AnyObject;
        use objc2::{class, msg_send};

        objc2::rc::autoreleasepool(|_| {
            let pasteboard: *mut AnyObject =
                msg_send![class!(NSPasteboard), generalPasteboard];
            if pasteboard.is_null() {
                return;
            }
            let _: isize = msg_send![pasteboard, clearContents];

            let item: *mut AnyObject = {
                let alloc: *mut AnyObject = msg_send![class!(NSPasteboardItem), alloc];
                let init: *mut AnyObject = msg_send![alloc, init];
                msg_send![init, autorelease]
            };

            let ns_text: *mut AnyObject = {
                let alloc: *mut AnyObject = msg_send![class!(NSString), alloc];
                let init: *mut AnyObject = msg_send![alloc,
                    initWithBytes: text.as_ptr() as *const std::ffi::c_void,
                    length: text.len(),
                    encoding: NS_UTF8_STRING_ENCODING
                ];
                msg_send![init, autorelease]
            };

            let type_str: *mut AnyObject = msg_send![
                class!(NSString),
                stringWithUTF8String: b"public.utf8-plain-text\0".as_ptr()
            ];
            let _: bool = msg_send![item, setString: ns_text, forType: type_str];

            let concealed_type: *mut AnyObject = msg_send![
                class!(NSString),
                stringWithUTF8String: b"org.nspasteboard.ConcealedType\0".as_ptr()
            ];
            let empty_data: *mut AnyObject = msg_send![class!(NSData), data];
            let _: bool = msg_send![item, setData: empty_data, forType: concealed_type];

            let array: *mut AnyObject =
                msg_send![class!(NSArray), arrayWithObject: item];
            let _: bool = msg_send![pasteboard, writeObjects: array];
        });
    }
    Ok(())
}
