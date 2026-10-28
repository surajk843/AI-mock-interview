import React from "react";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/components/container";
import { MainRoutes } from "@/lib/helpers";

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  hoverColor: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({
  href,
  icon,
  hoverColor,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`text-gray-300 transition-colors ${hoverColor}`}
  >
    {icon}
  </a>
);

interface FooterLinkProps {
  to: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ to, children }) => (
  <li>
    <Link
      to={to}
      className="text-gray-300 hover:text-gray-100 hover:underline"
    >
      {children}
    </Link>
  </li>
);

export const Footer = () => {
  return (
    <footer className="w-full bg-black py-8 text-gray-300">
      <Container>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-bold">Quick Links</h3>
            <ul className="space-y-2">
              {MainRoutes.map((route) => (
                <FooterLink key={route.href} to={route.href}>
                  {route.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">About Us</h3>
            <p>
              We are committed to helping you unlock your full potential with
              AI-powered tools. Our platform offers resources to improve your
              interview skills and chances of success.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Services</h3>
            <ul className="space-y-2">
              <FooterLink to="/services/interview-prep">
                Interview Preparation
              </FooterLink>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Contact Us</h3>
            <p className="mb-4">
              9004875177
              <br />
              surajkanojiya843@gmail.com
            </p>

            <div className="flex gap-4">
              <SocialLink
                href="https://www.facebook.com/share/1AUGcqcnBc/"
                icon={<Facebook size={24} />}
                hoverColor="hover:text-blue-500"
              />
              <SocialLink
                href="https://x.com/SurajKa96667506"
                icon={<Twitter size={24} />}
                hoverColor="hover:text-blue-400"
              />
              <SocialLink
                href="https://www.instagram.com/suraj_k._.s"
                icon={<Instagram size={24} />}
                hoverColor="hover:text-pink-500"
              />
              <SocialLink
                href="https://www.linkedin.com/in/suraj-kanojiya-362a11375"
                icon={<Linkedin size={24} />}
                hoverColor="hover:text-blue-700"
              />
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};