import { Navbar } from "@/components/Navbar";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { BackToTopButton } from "@/components/BackToTopButton";

const Inquiry = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">문의하기</h1>
        <p className="text-muted-foreground">문의 및 회원탈퇴 페이지 준비 중입니다.</p>
      </div>
      <BackToTopButton />
    </div>
  );
};

export default Inquiry;
