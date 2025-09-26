'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'vi';

type Dictionary = Record<string, { en: string; vi: string }>;

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const store: Dictionary = {
  // Common
  'common.back': { en: 'Back', vi: 'Quay lại' },
  'common.cancel': { en: 'Cancel', vi: 'Huỷ' },
  'common.create': { en: 'Create', vi: 'Tạo' },
  'common.update': { en: 'Update', vi: 'Cập nhật' },
  'common.save': { en: 'Save', vi: 'Lưu' },
  'common.saving': { en: 'Saving', vi: 'Đang lưu' },
  'common.delete': { en: 'Delete', vi: 'Xoá' },
  'common.edit': { en: 'Edit', vi: 'Sửa' },
  'common.close': { en: 'Close', vi: 'Đóng' },
  'common.loading': { en: 'Loading...', vi: 'Đang tải...' },
  'common.email': { en: 'Email', vi: 'Email' },
  'common.password': { en: 'Password', vi: 'Mật khẩu' },
  'common.fullName': { en: 'Full Name', vi: 'Họ và tên' },
  'common.retry': { en: 'Try Again', vi: 'Thử lại' },
  'common.fullNamePlaceholder': { en: 'Enter your full name', vi: 'Nhập họ và tên của bạn' },
  'common.signIn': { en: 'Sign In', vi: 'Đăng nhập' },
  'common.signUp': { en: 'Sign Up', vi: 'Đăng ký' },
  'common.signOut': { en: 'Sign Out', vi: 'Đăng xuất' },
  'common.title': { en: 'Title', vi: 'Tiêu đề' },
  'common.name': { en: 'Name', vi: 'Tên' },
  'common.copyrightSuffix': { en: 'All rights reserved.', vi: 'Đã đăng ký bản quyền.' },
  'common.role': { en: 'Role', vi: 'Vai trò' },
  'common.role.admin': { en: 'Admin', vi: 'Quản trị viên' },
  'common.role.member': { en: 'Member', vi: 'Thành viên' },
  'common.role.system': { en: 'System', vi: 'Hệ thống' },

  // Navigation
  'nav.articles': { en: 'Articles', vi: 'Bài viết' },
  'nav.about': { en: 'About us', vi: 'Về chúng tôi' },
  'nav.admin': { en: 'Admin', vi: 'Quản trị viên' },
  'nav.editProfile': { en: 'Edit Profile', vi: 'Chỉnh sửa hồ sơ' },
  'nav.language': { en: 'Language', vi: 'Ngôn ngữ' },

  // Auth Modal
  'auth.welcomeBack': { en: 'Welcome back', vi: 'Chào mừng trở lại' },
  'auth.createAccount': { en: 'Create an account', vi: 'Tạo tài khoản' },
  'auth.signInDescription': {
    en: 'Sign in to your account to continue',
    vi: 'Đăng nhập vào tài khoản để tiếp tục',
  },
  'auth.signUpDescription': {
    en: 'Enter your details to create a new account',
    vi: 'Nhập thông tin để tạo tài khoản mới',
  },
  'auth.continueWithGoogle': { en: 'Continue with Google', vi: 'Tiếp tục với Google' },
  'auth.orContinueWith': { en: 'Or continue with', vi: 'Hoặc tiếp tục với' },
  'auth.fullNamePlaceholder': { en: 'Enter your full name', vi: 'Nhập họ và tên của bạn' },
  'auth.emailPlaceholder': { en: 'Enter your email', vi: 'Nhập email của bạn' },
  'auth.passwordPlaceholder': { en: 'Enter your password', vi: 'Nhập mật khẩu của bạn' },
  'auth.confirmPassword': { en: 'Confirm Password', vi: 'Xác nhận mật khẩu' },
  'auth.confirmPasswordPlaceholder': {
    en: 'Confirm your password',
    vi: 'Xác nhận mật khẩu của bạn',
  },
  'auth.available': { en: 'Available', vi: 'Hợp lệ' },
  'auth.taken': { en: 'Taken', vi: 'Đã được sử dụng' },
  'auth.passwordsMatch': { en: 'Passwords match', vi: 'Mật khẩu khớp' },
  'auth.passwordsDoNotMatch': { en: 'Passwords do not match', vi: 'Mật khẩu không khớp' },
  'auth.signingIn': { en: 'Signing in...', vi: 'Đang đăng nhập...' },
  'auth.creatingAccount': { en: 'Creating account...', vi: 'Đang tạo tài khoản...' },
  'auth.dontHaveAccount': { en: "Don't have an account?", vi: 'Chưa có tài khoản?' },
  'auth.alreadyHaveAccount': { en: 'Already have an account?', vi: 'Đã có tài khoản?' },
  'auth.signInLink': { en: 'Sign in', vi: 'Đăng nhập' },
  'auth.agreeNotice': {
    en: 'By signing up, you agree to our',
    vi: 'Bằng việc đăng ký, bạn đồng ý với',
  },
  'auth.fillAllFields': { en: 'Please fill in all fields', vi: 'Vui lòng điền đầy đủ thông tin' },
  'auth.passwordsDoNotMatchError': { en: 'Passwords do not match', vi: 'Mật khẩu không khớp' },
  'auth.passwordTooShort': {
    en: 'Password must be at least 8 characters long',
    vi: 'Mật khẩu phải có ít nhất 8 ký tự',
  },
  'auth.passwordValid': {
    en: 'Valid',
    vi: 'Hợp lệ',
  },
  'auth.invalidEmail': {
    en: 'Invalid email',
    vi: 'Email không hợp lệ',
  },
  'auth.validEmail': {
    en: 'Valid email',
    vi: 'Email hợp lệ',
  },
  'auth.emailTaken': { en: 'Email is already taken', vi: 'Email đã được sử dụng' },
  'auth.loginSuccessful': { en: 'Login successful!', vi: 'Đăng nhập thành công!' },
  'auth.loginFailed': { en: 'Login failed', vi: 'Đăng nhập thất bại' },
  'auth.invalidEmailOrPassword': {
    en: 'Invalid email or password',
    vi: 'Email hoặc mật khẩu không đúng',
  },
  'auth.registrationFailed': { en: 'Registration failed', vi: 'Đăng ký thất bại' },
  'auth.googleLoginFailed': { en: 'Google login failed', vi: 'Đăng nhập Google thất bại' },
  'auth.emailCheckFailed': {
    en: 'Failed to check email availability',
    vi: 'Không thể kiểm tra email',
  },

  // Chat
  'chat.title': { en: 'Chat', vi: 'Trò chuyện' },
  'chat.online': { en: 'Online', vi: 'Trực tuyến' },
  'chat.offline': { en: 'Offline', vi: 'Ngoại tuyến' },
  'chat.loadingMessages': { en: 'Loading messages...', vi: 'Đang tải tin nhắn...' },
  'chat.loadMore': { en: 'Load More Messages', vi: 'Tải thêm tin nhắn' },
  'chat.typeMessage': { en: 'Type a message...', vi: 'Nhập tin nhắn...' },
  'chat.findConversation': { en: 'Find a conversation...', vi: 'Tìm cuộc trò chuyện...' },
  'chat.noConversation': { en: 'No conversation found', vi: 'Không có cuộc trò chuyện' },
  'chat.send': { en: 'Send', vi: 'Gửi' },
  'chat.sendMessage': { en: 'Send Message', vi: 'Gửi tin nhắn' },

  // Articles
  'articles.my': { en: 'My Articles', vi: 'Bài viết của tôi' },
  'articles.latest': { en: 'Latest Articles', vi: 'Bài viết mới nhất' },
  'articles.all': { en: 'All Articles', vi: 'Tất cả bài viết' },
  'articles.total': { en: 'Articles', vi: 'Bài viết' },
  'articles.allCategories': { en: 'All Categories', vi: 'Tất cả danh mục' },
  'articles.manageIntro': {
    en: 'Manage your articles and share your knowledge',
    vi: 'Quản lý bài viết và chia sẻ kiến thức của bạn',
  },
  'articles.new': { en: 'New Article', vi: 'Bài viết mới' },
  'articles.searchPlaceholder': {
    en: 'Search your articles...',
    vi: 'Tìm bài viết của bạn...',
  },
  'articles.sort.title': { en: 'Title', vi: 'Tiêu đề' },
  'articles.sort.created': { en: 'Created', vi: 'Ngày tạo' },
  'articles.sort.updated': { en: 'Updated', vi: 'Ngày cập nhật' },
  'articles.published': { en: 'Published', vi: 'Đã xuất bản' },
  'articles.draft': { en: 'Draft', vi: 'Bản nháp' },
  'articles.menu.publish': { en: 'Publish', vi: 'Xuất bản' },
  'articles.menu.unpublish': { en: 'Unpublish', vi: 'Gỡ xuất bản' },
  'articles.menu.preview': { en: 'Preview', vi: 'Xem thử' },
  'articles.menu.view': { en: 'View', vi: 'Xem' },
  'articles.related': { en: 'Related Articles', vi: 'Bài viết liên quan' },
  'articles.form.createNew': { en: 'Create New Article', vi: 'Tạo bài viết mới' },
  'articles.form.title': { en: 'Title', vi: 'Tiêu đề' },
  'articles.form.slug': { en: 'Slug', vi: 'Slug' },
  'articles.form.titlePlaceholder': { en: 'Enter article title', vi: 'Nhập tiêu đề bài viết' },
  'articles.form.slugPlaceholder': { en: 'article-slug', vi: 'bai-viet-slug' },
  'articles.form.thumbnail': { en: 'Thumbnail', vi: 'Ảnh đại diện' },
  'articles.form.clickToUpload': {
    en: 'Click to upload thumbnail',
    vi: 'Nhấn để tải ảnh đại diện',
  },
  'articles.form.thumbHint': {
    en: 'PNG, JPG, GIF, WebP up to 5MB',
    vi: 'PNG, JPG, GIF, WebP tối đa 5MB',
  },
  'articles.form.category': { en: 'Category', vi: 'Danh mục' },
  'articles.form.selectCategory': { en: 'Select a category', vi: 'Chọn danh mục' },
  'articles.form.content': { en: 'Content', vi: 'Nội dung' },
  'articles.form.publishNow': { en: 'Publish immediately', vi: 'Xuất bản ngay' },

  // Profile
  'profile.notFound': { en: 'Profile not found', vi: 'Không tìm thấy hồ sơ' },
  'profile.yourProfile': { en: 'Your Profile', vi: 'Hồ sơ của bạn' },
  'profile.userProfile': { en: 'User Profile', vi: 'Hồ sơ người dùng' },
  'profile.settings': { en: 'Profile Settings', vi: 'Cài đặt hồ sơ' },
  'profile.manageIntro': {
    en: 'Manage your account information and preferences',
    vi: 'Quản lý thông tin tài khoản và tuỳ chọn của bạn',
  },
  'profile.emailAddress': { en: 'Email Address', vi: 'Địa chỉ Email' },
  'profile.updated': { en: 'Profile updated successfully', vi: 'Cập nhật hồ sơ thành công' },
  'profile.totalArticles': { en: 'Total Articles', vi: 'Tổng số bài viết' },
  'profile.totalComments': { en: 'Total Comments', vi: 'Tổng bình luận' },
  'profile.totalLikes': { en: 'Total Likes', vi: 'Tổng lượt thích' },
  'profile.totalDislikes': { en: 'Total Dislikes', vi: 'Tổng lượt không thích' },
  'profile.accessLevel': { en: 'Access level', vi: 'Quyền truy cập' },
  'profile.memberSince': { en: 'Member since', vi: 'Thời gian gia nhập' },
  'profile.upload': { en: 'Upload', vi: 'Tải lên' },

  // Admin
  'admin.accessDenied': {
    en: 'Access denied. Admin privileges required.',
    vi: 'Truy cập bị từ chối. Cần quyền quản trị.',
  },
  'admin.panel': { en: 'Admin Panel', vi: 'Trang quản trị' },
  'admin.userManagement': { en: 'User Management', vi: 'Quản lý người dùng' },
  'admin.showing': { en: 'Showing:', vi: 'Hiển thị:' },
  'admin.usersAbbrev': { en: 'user(s)', vi: 'người dùng' },
  'admin.onPage': { en: 'on page', vi: 'ở trang' },
  'admin.of': { en: 'of', vi: 'trên' },
  'admin.totalSuffix': { en: 'total', vi: 'tổng' },
  'admin.sort.name': { en: 'Name', vi: 'Tên' },
  'admin.sort.joined': { en: 'Joined', vi: 'Ngày tham gia' },
  'admin.searchPlaceholder': {
    en: 'Search by name or email...',
    vi: 'Tìm theo tên hoặc email...',
  },
  'admin.table.role': { en: 'Role', vi: 'Vai trò' },
  'admin.table.joined': { en: 'Joined', vi: 'Ngày tham gia' },
  'admin.page': { en: 'Page', vi: 'Trang' },
  'admin.usersPerPage': { en: 'users per page', vi: 'người dùng mỗi trang' },
  'admin.previous': { en: 'Previous', vi: 'Trước' },
  'admin.next': { en: 'Next', vi: 'Sau' },
  'admin.categories': { en: 'Categories', vi: 'Danh mục' },
  'admin.categoriesManagement': { en: 'Categories Management', vi: 'Quản lý danh mục' },
  'admin.newCategory': { en: 'New Category', vi: 'Danh mục mới' },
  'admin.rootCategory': { en: 'Root Category', vi: 'Danh mục gốc' },
  'admin.subCategories': { en: 'Sub categories', vi: 'Danh mục con' },
  'admin.createdBy': { en: 'Created by', vi: 'Tạo bởi' },

  // Homepage
  'home.searchPlaceholder': {
    en: 'Search articles, author or email...',
    vi: 'Tìm bài viết, tác giả hoặc email...',
  },
  'home.featured': { en: 'Featured', vi: 'Nổi bật' },
  'home.featuredSubtitle': {
    en: 'Trending picks by community engagement',
    vi: 'Bài viết nổi bật theo tương tác cộng đồng',
  },
  'home.myArticles': { en: 'My Articles', vi: 'Bài viết của tôi' },
  'home.clearFilters': { en: 'Clear Filters', vi: 'Xoá bộ lọc' },
  'home.latestArticles': { en: 'Latest Articles', vi: 'Bài viết mới nhất' },
  'home.tagline': {
    en: "Latest updates and ideas from Vietnam's developer community",
    vi: 'Những cập nhật và ý tưởng mới nhất từ ​​cộng đồng lập trình viên Việt Nam',
  },
  'home.noMore': { en: 'No more articles to show', vi: 'Không còn bài viết để hiển thị' },
  'home.readMore': { en: 'Read more', vi: 'Xem chi tiết' },

  // About Page
  'about.title': { en: 'About CodeVN', vi: 'Giới thiệu CodeVN' },
  'about.greeting': {
    en: 'Hey there, fellow coder! 👋',
    vi: 'Chào bạn, đồng nghiệp coder thân mến! 👋',
  },
  'about.p1': {
    en: "Tired of coding in a vacuum? So were we! That's why we built CodeVN – not just another platform, but a vibrant digital playground for developers like you.",
    vi: 'Bạn có cảm thấy đôi khi code một mình hơi... buồn không? Chúng tôi cũng thế! Đó là lý do CodeVN ra đời – không phải một nền tảng nhàm chán, mà là một sân chơi sống động, được xây bởi và dành cho chính những lập trình viên.',
  },
  'about.p2': {
    en: "Think of us as your favorite coffee shop, but online. It's the place where you can:",
    vi: 'Hãy nghĩ về CodeVN như một quán cà phê đầy ắp tâm hồn đồng điệu. Nơi bạn có thể:',
  },
  'about.list1': {
    en: "Brag about your brainchild: Show off that side project you've been burning the midnight oil on. We want to see it!",
    vi: '"Khoe" tác phẩm để đời: Khoe ngay dự án bạn đã "đổ mồ hôi, sôi nước mắt". Chúng tôi luôn sẵn sàng "hú hét" vì nó!',
  },
  'about.list2': {
    en: 'Unravel the mysteries: Stuck on a bug? Share your knowledge, ask questions, and crack tough problems together. Sharing is caring, after all.',
    vi: 'Cùng nhau "giải cứu bug": Chia sẻ kiến thức, đặt câu hỏi và cùng nhau "vật lộn" với những dòng code bướng bỉnh. Chia sẻ là cách học tuyệt nhất mà!',
  },
  'about.list3': {
    en: "Find your people: Connect with peers who don't just understand your code, but also the struggle and the euphoria that comes with it.",
    vi: 'Tìm thấy "hội" của mình: Kết nối với những người không chỉ hiểu code của bạn, mà còn thấu hiểu cả những "nỗi đau" và niềm vui bất tận trong nghề.',
  },
  'about.p3': {
    en: "We're obsessed with keeping things high-quality, clean, and smooth. No clutter, no noise. Just pure, unadulterated developer joy.",
    vi: 'Triết lý của chúng tôi rất đơn giản: Nội dung chất lượng, thiết kế sạch đẹp, và trải nghiệm mượt mà. Không rối rắm, không quảng cáo phiền phức. Chỉ có sự đam mê thuần khiết dành cho công nghệ.',
  },
  'about.p4': {
    en: 'Every great project needs a home. CodeVN was born from that simple idea. You can actually visit our very first commit and see how it all began on our GitHub repository – it’s an open book!',
    vi: 'Mọi dự án tuyệt vời đều cần một nơi để "sinh sống". CodeVN cũng được ấp ủ như thế. Bạn thậm chí có thể "ghé thăm" nơi tôi ra đời và xem những dòng code đầu tiên tại kho GitHub của chúng tôi – mọi thứ đều minh bạch!',
  },
  'about.p5': {
    en: 'But a platform is nothing without its people. This is also the place for you to share your story, your projects, and your expertise. Here, everyone has a profile, a space to let others know more about who you are and what you build.',
    vi: 'Nhưng một nền tảng sẽ chẳng là gì nếu không có cộng đồng. Đây cũng là nơi dành cho bạn để chia sẻ câu chuyện của mình, những dự án "chất lừ" và kinh nghiệm bạn có. Tại đây, mỗi người đều có một không gian riêng để mọi người biết nhiều hơn về bạn và những gì bạn tạo ra.',
  },
  'about.p6': {
    en: "So, what are you waiting for? Pull up a virtual chair, pour yourself a drink (coffee, boba, or whatever fuels your code), and let's build something amazing, together.",
    vi: 'Còn chần chừ gì nữa? Ghé ngay một "góc" ảo, pha một ly cà phê (hoặc trà sữa, nước tăng lực... thứ gì khiến bạn tỉnh táo để code), và cùng chúng tôi kiến tạo những điều tuyệt vời nhé!',
  },
  'about.p7': {
    en: 'Welcome to your new tech home.',
    vi: 'Chào mừng bạn đến với ngôi nhà công nghệ của chúng mình!',
  },

  // Not Found
  'notFound.title': { en: 'Page not found', vi: 'Không tìm thấy trang' },
  'notFound.description': {
    en: 'The page you’re looking for doesn’t exist or has been moved.',
    vi: 'Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.',
  },
  'notFound.backHome': { en: 'Back to Home', vi: 'Về trang chủ' },

  // Leaderboard
  'leaderboard.title': { en: 'Leaderboard', vi: 'Bảng xếp hạng' },
  'leaderboard.subtitle': {
    en: 'See the most active members in the community',
    vi: 'Xem những thành viên tích cực nhất trong cộng đồng',
  },
  'leaderboard.tryAgain': { en: 'Try Again', vi: 'Thử lại' },
  'leaderboard.noData': {
    en: 'No data available for this timeframe',
    vi: 'Không có dữ liệu cho khoảng thời gian này',
  },

  // Comments/Article Content
  'comments.showReplies': { en: 'Show replies', vi: 'Hiện trả lời' },
  'comments.writeReply': { en: 'Write a reply...', vi: 'Viết trả lời...' },
  'comments.writeComment': { en: 'Write a comment...', vi: 'Viết bình luận...' },
  'comments.characters': { en: 'characters', vi: 'kí tự' },
  'comments.reply': { en: 'Reply', vi: 'Trả lời' },
  'comments.comment': { en: 'Comment', vi: 'Bình luận' },
  'comments.loadMoreComments': { en: 'Load more comments', vi: 'Tải thêm bình luận' },
  'comments.loadMoreReplies': { en: 'Load more replies', vi: 'Tải thêm trả lời' },
  'comments.noCommentsYet': {
    en: 'No comments yet. Be the first to comment!',
    vi: 'Chưa có bình luận nào. Hãy là người bình luận đầu tiên!',
  },
  'comments.signInToPost.prefix': { en: 'Please', vi: 'Vui lòng' },
  'comments.signInToPost.suffix': { en: 'to post comments.', vi: 'để bình luận.' },

  // Admin - Categories modal
  'admin.category.new': { en: 'New Category', vi: 'Danh mục mới' },
  'admin.category.name': { en: 'Name', vi: 'Tên' },
  'admin.category.namePlaceholder': { en: 'Enter category name', vi: 'Nhập tên danh mục' },
  'admin.category.description': { en: 'Description', vi: 'Mô tả' },
  'admin.category.descriptionPlaceholder': {
    en: 'Enter category description',
    vi: 'Nhập mô tả danh mục',
  },
  'admin.category.color': { en: 'Color', vi: 'Màu' },
  'admin.parentCategory': { en: 'Parent Category', vi: 'Danh mục cha' },
  'admin.category.noParentRoot': { en: 'No parent (Root Category)', vi: 'Không có (Danh mục gốc)' },

  // Share
  'share.share': { en: 'Share', vi: 'Chia sẻ' },
  'share.copyLink': { en: 'Copy link', vi: 'Sao chép liên kết' },
  'share.viaDevice': { en: 'Share via device', vi: 'Chia sẻ qua thiết bị' },
  'share.defaultTitle': { en: 'Check out this article', vi: 'Xem bài viết này' },
  'share.copiedTitle': { en: 'Copied', vi: 'Đã sao chép' },
  'share.copiedMessage': {
    en: 'Article link copied to clipboard',
    vi: 'Đã sao chép liên kết bài viết',
  },
  'share.failedTitle': { en: 'Failed', vi: 'Thất bại' },
  'share.failedMessage': { en: 'Could not copy link', vi: 'Không thể sao chép liên kết' },
  'common.and': { en: 'and', vi: 'và' },

  // Session Management
  'sessions.title': { en: 'Session Management', vi: 'Quản lý phiên đăng nhập' },
  'sessions.subtitle': {
    en: "Manage your active sessions across all devices. You can see where you're signed in and sign out of specific devices.",
    vi: 'Quản lý các phiên đăng nhập đang hoạt động trên tất cả thiết bị. Bạn có thể xem nơi đang đăng nhập và đăng xuất khỏi các thiết bị cụ thể.',
  },

  // Terms of Service
  'terms.title': { en: 'Terms of Service', vi: 'Điều khoản Dịch vụ' },
  'terms.welcome': { en: 'Welcome to CodeVN.dev', vi: 'Chào mừng bạn đến với CodeVN.dev' },
  'terms.agreement': {
    en: 'By participating in and using this platform, you agree to the following terms.',
    vi: 'Khi tham gia và sử dụng nền tảng này, bạn đồng ý tuân thủ các điều khoản dưới đây.',
  },
  'terms.purpose.title': { en: '1. Purpose', vi: '1. Mục đích' },
  'terms.purpose.p1': {
    en: 'This is a non-profit blog and forum where users can write articles, share knowledge, comment, and chat about information technology.',
    vi: 'Đây là một blog và diễn đàn phi lợi nhuận, nơi mọi người có thể viết bài, chia sẻ kiến thức, bình luận và trò chuyện về công nghệ thông tin.',
  },
  'terms.purpose.p2': {
    en: 'CodeVN.dev operates without commercial intent and does not charge users any fees.',
    vi: 'CodeVN.dev không hoạt động vì mục đích thương mại và không thu bất kỳ khoản phí nào từ người dùng.',
  },
  'terms.content.title': { en: '2. User-Generated Content', vi: '2. Nội dung do người dùng tạo' },
  'terms.content.p1': {
    en: 'Users are fully responsible for the content they post (articles, comments, or messages).',
    vi: 'Người dùng chịu trách nhiệm cho toàn bộ nội dung mà mình đăng tải (bài viết, bình luận hoặc tin nhắn).',
  },
  'terms.content.p2': {
    en: 'It is prohibited to post content that is illegal, misleading, discriminatory, hateful, or infringing intellectual property rights.',
    vi: 'Không được phép đăng tải nội dung vi phạm pháp luật, thông tin sai lệch, phân biệt đối xử, thù ghét hoặc vi phạm quyền sở hữu trí tuệ.',
  },
  'terms.content.p3': {
    en: 'Content may be edited or removed if it violates these rules.',
    vi: 'Nội dung có thể bị chỉnh sửa hoặc gỡ bỏ nếu vi phạm các quy định này.',
  },
  'terms.privacy.title': { en: '3. Privacy', vi: '3. Quyền riêng tư' },
  'terms.privacy.p1': {
    en: 'Chat messages are not publicly displayed.',
    vi: 'Tin nhắn trò chuyện (chat messages) không được hiển thị công khai.',
  },
  'terms.privacy.p2': {
    en: 'Your personal information will be kept private and will not be shared with third parties unless required by law.',
    vi: 'Thông tin cá nhân của bạn sẽ được bảo mật và không chia sẻ cho bên thứ ba, trừ khi pháp luật yêu cầu.',
  },
  'terms.responsibility.title': { en: '4. Responsibility', vi: '4. Trách nhiệm' },
  'terms.responsibility.p1': {
    en: 'CodeVN.dev is not responsible for the accuracy or reliability of user-generated content.',
    vi: 'CodeVN.dev không chịu trách nhiệm về tính chính xác hoặc độ tin cậy của nội dung do người dùng đăng tải.',
  },
  'terms.responsibility.p2': {
    en: 'Users should carefully evaluate and verify any information before applying it.',
    vi: 'Người dùng nên tự cân nhắc và kiểm chứng trước khi áp dụng bất kỳ thông tin nào từ diễn đàn.',
  },
  'terms.modifications.title': { en: '5. Modifications', vi: '5. Sửa đổi điều khoản' },
  'terms.modifications.p1': {
    en: 'CodeVN.dev may update these terms at any time. Updates will be announced on the website.',
    vi: 'CodeVN.dev có thể cập nhật điều khoản dịch vụ bất kỳ lúc nào. Các thay đổi sẽ được thông báo trên trang web.',
  },
  'terms.modifications.p2': {
    en: 'Continued use of the platform after changes means you accept the updated terms.',
    vi: 'Việc tiếp tục sử dụng dịch vụ sau khi điều khoản thay đổi đồng nghĩa với việc bạn chấp nhận các cập nhật đó.',
  },
  'terms.contact.title': { en: '6. Contact', vi: '6. Liên hệ' },
  'terms.contact.p1': {
    en: 'For questions or concerns about these Terms of Service, please use the Contact page on CodeVN.dev.',
    vi: 'Nếu bạn có câu hỏi hoặc thắc mắc về Điều khoản dịch vụ, vui lòng liên hệ qua trang Liên hệ trên CodeVN.dev.',
  },

  // Privacy Policy
  'privacy.title': { en: 'Privacy Policy', vi: 'Chính sách Quyền riêng tư' },
  'privacy.collection.title': { en: '1. Data Collection', vi: '1. Thu thập dữ liệu' },
  'privacy.collection.p1': {
    en: 'CodeVN.dev does not collect personal data beyond what is necessary for using the blog and forum.',
    vi: 'CodeVN.dev không thu thập dữ liệu cá nhân ngoài những gì cần thiết để sử dụng blog và diễn đàn.',
  },
  'privacy.collection.p2': {
    en: 'No sensitive information is required to participate.',
    vi: 'Không yêu cầu thông tin nhạy cảm để tham gia.',
  },
  'privacy.use.title': { en: '2. Use of Data', vi: '2. Sử dụng dữ liệu' },
  'privacy.use.p1': {
    en: 'Information provided (such as username or posted content) is used solely for community participation.',
    vi: 'Thông tin cung cấp (như tên người dùng hoặc nội dung đăng tải) chỉ được dùng cho mục đích tham gia cộng đồng.',
  },
  'privacy.use.p2': {
    en: 'We do not sell or share your information with third parties.',
    vi: 'Chúng tôi không bán hoặc chia sẻ thông tin của bạn cho bên thứ ba.',
  },
  'privacy.cookies.title': { en: '3. Cookies and Tracking', vi: '3. Cookie và theo dõi' },
  'privacy.cookies.p1': {
    en: 'CodeVN.dev may use minimal cookies to improve user experience (such as remembering login sessions).',
    vi: 'CodeVN.dev có thể sử dụng cookie cơ bản để cải thiện trải nghiệm người dùng (ví dụ: ghi nhớ phiên đăng nhập).',
  },
  'privacy.cookies.p2': {
    en: 'We do not use tracking for advertising purposes.',
    vi: 'Chúng tôi không sử dụng công cụ theo dõi cho mục đích quảng cáo.',
  },
  'privacy.security.title': { en: '4. Security', vi: '4. Bảo mật' },
  'privacy.security.p1': {
    en: 'We take reasonable measures to protect your information but cannot guarantee absolute security.',
    vi: 'Chúng tôi áp dụng các biện pháp hợp lý để bảo vệ thông tin của bạn nhưng không thể đảm bảo an toàn tuyệt đối.',
  },
  'privacy.changes.title': { en: '5. Changes', vi: '5. Thay đổi' },
  'privacy.changes.p1': {
    en: 'This Privacy Policy may be updated periodically. Changes will be posted on the website.',
    vi: 'Chính sách Quyền riêng tư có thể được cập nhật định kỳ. Các thay đổi sẽ được đăng tải trên trang web.',
  },
  'privacy.contact.title': { en: '6. Contact', vi: '6. Liên hệ' },
  'privacy.contact.p1': {
    en: 'If you have any privacy concerns, please reach out via the Contact page on CodeVN.dev.',
    vi: 'Nếu bạn có thắc mắc liên quan đến quyền riêng tư, vui lòng liên hệ qua trang Liên hệ trên CodeVN.dev.',
  },
  'sessions.activeSessions': { en: 'Active Sessions', vi: 'Phiên đăng nhập đang hoạt động' },
  'sessions.allSessions': { en: 'All Sessions', vi: 'Tất cả phiên' },
  'sessions.current': { en: 'Current', vi: 'Hiện tại' },
  'sessions.otherDevices': { en: 'Other Devices', vi: 'Thiết bị khác' },
  'sessions.terminateOtherSessions': { en: 'Terminate Other Sessions', vi: 'Kết thúc phiên khác' },
  'sessions.noSessionsFound': {
    en: 'No sessions found for the selected filter.',
    vi: 'Không tìm thấy phiên nào cho bộ lọc đã chọn.',
  },
  'sessions.unknownDevice': { en: 'Unknown Device', vi: 'Thiết bị không xác định' },
  'sessions.currentBadge': { en: 'Current', vi: 'Hiện tại' },
  'sessions.info': { en: 'Info', vi: 'Thông tin' },
  'sessions.terminate': { en: 'Terminate', vi: 'Kết thúc' },
  'sessions.sessionDetails': { en: 'Session Details', vi: 'Chi tiết phiên đăng nhập' },
  'sessions.sessionDetailsDescription': {
    en: 'Detailed information about this session.',
    vi: 'Thông tin chi tiết về phiên đăng nhập này.',
  },
  'sessions.deviceInformation': { en: 'Device Information', vi: 'Thông tin thiết bị' },
  'sessions.locationTime': { en: 'Location & Time', vi: 'Vị trí & Thời gian' },
  'sessions.country': { en: 'Country', vi: 'Quốc gia' },
  'sessions.loginTime': { en: 'Login Time', vi: 'Thời gian đăng nhập' },
  'sessions.lastActive': { en: 'Last Active', vi: 'Hoạt động cuối' },
  'sessions.unknown': { en: 'Unknown', vi: 'Không xác định' },
  'sessions.terminateSession': { en: 'Terminate Session', vi: 'Kết thúc phiên đăng nhập' },
  'sessions.terminateSessionDescription': {
    en: 'This will sign out the selected session from that device. The user will need to sign in again on that device.',
    vi: 'Điều này sẽ đăng xuất phiên đăng nhập đã chọn khỏi thiết bị đó. Người dùng sẽ cần đăng nhập lại trên thiết bị đó.',
  },
  'sessions.terminateOtherSessionsTitle': {
    en: 'Terminate Other Sessions',
    vi: 'Kết thúc các phiên khác',
  },
  'sessions.terminateOtherSessionsDescription': {
    en: "This will terminate all other sessions except your current one. You'll remain signed in on this device.",
    vi: 'Điều này sẽ kết thúc tất cả các phiên khác ngoại trừ phiên hiện tại của bạn. Bạn sẽ vẫn đăng nhập trên thiết bị này.',
  },
  'sessions.terminateSessionButton': { en: 'Terminate Session', vi: 'Kết thúc phiên đăng nhập' },
  'sessions.terminateOtherSessionsButton': {
    en: 'Terminate Other Sessions',
    vi: 'Kết thúc các phiên khác',
  },
  'sessions.loadingSessions': {
    en: 'Loading session management...',
    vi: 'Đang tải quản lý phiên đăng nhập...',
  },
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'vi',
      setLocale: (locale) => {
        set({ locale });
        // Persist to cookie for SSR consistency
        if (typeof document !== 'undefined') {
          const expireDays = 365;
          const expires = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toUTCString();
          document.cookie = `locale=${locale}; path=/; expires=${expires}`;
        }
      },
      t: (key) => {
        const { locale } = get();
        const entry = store[key];
        return entry ? (entry[locale] ?? key) : key;
      },
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);
