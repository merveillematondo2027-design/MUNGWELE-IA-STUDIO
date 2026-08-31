# Mobile social retrofit

This branch standardizes the mobile UX requested for MUNGWELE AI STUDIO and M.Digi:

- compact publication modal with a single visible download-permission checkbox;
- credit balance visible on the home screen without a large account card;
- notification and message unread badges in the top navigation and menu;
- M.Digi/Facebook-style horizontal social navigation;
- community sharing uses the device share sheet directly;
- community download is exposed only when the publisher authorizes it and still passes through MUNGWELE download policy;
- native media download controls are suppressed where browsers support `controlsList=nodownload`; the MUNGWELE download button remains the supported path;
- video settings use a single generation-engine picker containing all engines, with connected engines selectable and planned engines disabled;
- video settings end with an Apply button.

Web limitation: a browser can save a generated file into the device Downloads area, but a normal web application cannot force Android/iOS to index it immediately into the Gallery. A future native Android build can use the device MediaStore/Photos APIs for direct Gallery saving.
