import React from "react";

import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"; // Import Lucide icons
import { Link } from "react-router-dom";
import { Container } from "@/components/container";
import { MainRoutes } from "@/lib/helpers";

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  hoverColor: string;
}

const SocialLink: React.FC<SocialLinkProps> = ({ href, icon, hoverColor }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover:${hoverColor}`}
    >
      {icon}
    </a>
  );
};

interface FooterLinkProps {
  to: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ to, children }) => {
  return (
    <li>
      <Link
        to={to}
        className="hover:underline text-gray-300 hover:text-gray-100"
      >
        {children}
      </Link>
    </li>
  );
};

export const Footer = () => {
  return (
    <div className="w-full bg-black text-gray-300 hover:text-gray-100 py-8">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* First Column: Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {MainRoutes.map((route) => (
                <FooterLink key={route.href} to={route.href}>
                  {route.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Second Column: About Us */}
          <div>
            <h3 className="font-bold text-lg mb-4">About Us</h3>
            <p>
              We are committed to helping you unlock your full potential with
              AI-powered tools. Our platform offers a wide range of resources to
              improve your interview skills and chances of success.
            </p>
          </div>

          {/* Third Column: Services */}
          <div>
            <h3 className="font-bold text-lg mb-4">Services</h3>
            <ul>
              <p to="/services/interview-prep">
                Interview Preparation
              </p>
              {/* <p to="/services/career-coaching">
                Career Coaching
              </p>
              <p to="/services/resume-building">
                Resume Building
              </p> */}
            </ul>
          </div>

          {/* Fourth Column: Address and Social Media */}
          <div>
            <h3 className="font-bold text-lg mb-4">Contact Us</h3>
            <p className="mb-4">9004875177 surajkanojiya843@gmail.com</p>
            <div className="flex gap-4">
              <SocialLink
                href="https://www.facebook.com/share/1AUGcqcnBc/"
                icon={<Facebook size={24} />}
                hoverColor="text-blue-500"
              />
              <SocialLink
                href="https://x.com/SurajKa96667506"
                icon={<Twitter size={24} />}
                hoverColor="text-blue-400"
              />
              <SocialLink
                href="https://www.instagram.com/suraj_k._.s?igsh=MXFjdXd3MmlmNWwwOA=="
                icon={<Instagram size={24} />}
                hoverColor="text-pink-500"
              />
              <SocialLink
                href="https://www.linkedin.com/in/suraj-kanojiya-362a11375?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                icon={<Linkedin size={24} />}
                hoverColor="text-blue-700"
              />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};
